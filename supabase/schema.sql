-- 정함 데이터베이스 스키마 (Supabase SQL Editor에 통째로 붙여넣고 Run)
-- 개인 데이터는 RLS로 본인만 읽고 쓰기. 진단·이벤트는 익명 집계용으로 삽입만 허용.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text,
  created_at timestamptz default now()
);

create table if not exists diagnoses (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  anon_id text,
  skin_type text,
  concerns text[],
  sensitive text,
  shave text,
  current_steps text,
  plan text,
  budget int,
  picks text[],
  total int,
  created_at timestamptz default now()
);

create table if not exists routines (
  user_id uuid primary key references auth.users on delete cascade,
  answers jsonb not null,
  ids text[] not null,
  start jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table if not exists checks (
  user_id uuid references auth.users on delete cascade,
  day date not null,
  am boolean default false,
  pm boolean default false,
  primary key (user_id, day)
);

create table if not exists skin_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  day date not null,
  overall int check (overall between 1 and 5),
  trouble int check (trouble between 0 and 3),
  oil int check (oil between 0 and 3),
  dry int check (dry between 0 and 3),
  note text,
  photo_path text,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  product_id text not null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

create table if not exists events (
  id bigint generated always as identity primary key,
  anon_id text,
  user_id uuid,
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists push_subs (
  endpoint text primary key,
  user_id uuid references auth.users on delete cascade,
  keys jsonb not null,
  am_hour int default 8,
  pm_hour int default 22,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table diagnoses enable row level security;
alter table routines enable row level security;
alter table checks enable row level security;
alter table skin_logs enable row level security;
alter table feedback enable row level security;
alter table events enable row level security;
alter table push_subs enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own routine" on routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checks" on checks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on skin_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own feedback" on feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own push" on push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "insert diagnoses" on diagnoses for insert with check (user_id is null or auth.uid() = user_id);
create policy "insert events" on events for insert with check (user_id is null or auth.uid() = user_id);

-- 제품 평균 만족도(누구나 읽기 가능한 집계)
create or replace function product_ratings()
returns table(product_id text, avg numeric, n bigint)
language sql security definer set search_path = public as $$
  select product_id, round(avg(rating)::numeric, 2), count(*) from feedback group by product_id;
$$;
grant execute on function product_ratings() to anon, authenticated;

-- 운영자 대시보드 집계 (관리자 이메일만)
create table if not exists admins (email text primary key);

create or replace function admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then
    raise exception 'not admin';
  end if;
  select jsonb_build_object(
    'diagnoses', (select count(*) from diagnoses),
    'users', (select count(*) from auth.users),
    'routines', (select count(*) from routines),
    'skin', (select coalesce(jsonb_object_agg(skin_type, c), '{}') from (select skin_type, count(*) c from diagnoses group by 1) t),
    'concerns', (select coalesce(jsonb_object_agg(c, n), '{}') from (select unnest(concerns) c, count(*) n from diagnoses group by 1) t),
    'plans', (select coalesce(jsonb_object_agg(plan, c), '{}') from (select plan, count(*) c from diagnoses group by 1) t),
    'budget', (select coalesce(jsonb_object_agg(budget, c), '{}') from (select budget, count(*) c from diagnoses group by 1) t),
    'events', (select coalesce(jsonb_object_agg(type, c), '{}') from (select type, count(*) c from events group by 1) t),
    'topPicks', (select coalesce(jsonb_agg(t), '[]') from (select p id, count(*) n from diagnoses, unnest(picks) p group by p order by n desc limit 10) t),
    'buyClicks', (select coalesce(jsonb_agg(t), '[]') from (select payload->>'id' id, count(*) n from events where type = 'click_buy' group by 1 order by n desc limit 10) t),
    'ratings', (select coalesce(jsonb_agg(t), '[]') from (select product_id id, round(avg(rating)::numeric,2) avg, count(*) n from feedback group by 1 order by n desc limit 10) t),
    'daily', (select coalesce(jsonb_agg(t order by d), '[]') from (select created_at::date d, count(*) n from diagnoses where created_at > now() - interval '30 days' group by 1) t),
    'checkRate', (select round(avg((am::int + pm::int) / 2.0)::numeric, 3) from checks where day > current_date - 14)
  ) into r;
  return r;
end $$;
grant execute on function admin_stats() to authenticated;

-- 피부 사진 비공개 버킷
insert into storage.buckets (id, name, public) values ('skin', 'skin', false) on conflict do nothing;
create policy "own photos read" on storage.objects for select using (bucket_id = 'skin' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own photos write" on storage.objects for insert with check (bucket_id = 'skin' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own photos delete" on storage.objects for delete using (bucket_id = 'skin' and auth.uid()::text = (storage.foldername(name))[1]);
