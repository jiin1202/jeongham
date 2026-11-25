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
  irritation int check (irritation between 0 and 3),
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
-- 4주 플랜 목표일 + "나 같은 남자" 4주 후기 집계

alter table routines add column if not exists goal jsonb;

-- 4주 후기: 로그인 없이도 남길 수 있게 익명 ID 기준. 개인 식별 정보는 받지 않음
create table if not exists reviews (
  id bigint generated always as identity primary key,
  anon_id text not null,
  user_id uuid references auth.users on delete set null,
  product_id text not null,
  skin_type text not null check (skin_type in ('dry','oily','combo','normal')),
  concern text,
  sensitive text,
  shave text,
  days_used int not null check (days_used >= 21),
  rating int not null check (rating between 1 and 5),
  change text not null check (change in ('better','same','worse')),
  again boolean not null,
  created_at timestamptz default now(),
  unique (anon_id, product_id)
);
alter table reviews enable row level security;
-- 직접 읽기·쓰기는 막고, 아래 함수로만 넣고 집계만 읽는다
revoke all on reviews from anon, authenticated;

create or replace function submit_review(
  p_anon text, p_product text, p_skin text, p_concern text, p_sensitive text, p_shave text,
  p_days int, p_rating int, p_change text, p_again boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_anon, '')) < 8 or length(p_product) > 20 then raise exception 'bad input'; end if;
  insert into reviews (anon_id, user_id, product_id, skin_type, concern, sensitive, shave, days_used, rating, change, again)
  values (p_anon, auth.uid(), p_product, p_skin, p_concern, p_sensitive, p_shave, p_days, p_rating, p_change, p_again)
  on conflict (anon_id, product_id) do update
    set rating = excluded.rating, change = excluded.change, again = excluded.again, days_used = excluded.days_used, created_at = now();
end $$;
grant execute on function submit_review(text,text,text,text,text,text,int,int,text,boolean) to anon, authenticated;

-- 제품별 · 피부 타입별 집계. 3명 미만 그룹은 내보내지 않음(개인 추정 방지)
create or replace function peer_results(p_product text)
returns table(skin_type text, n bigint, avg_rating numeric, better_pct int, again_pct int)
language sql security definer set search_path = public as $$
  select skin_type, count(*), round(avg(rating)::numeric, 1),
         round(100.0 * avg((change = 'better')::int))::int, round(100.0 * avg(again::int))::int
  from reviews where product_id = p_product group by skin_type having count(*) >= 3
  union all
  select 'all', count(*), round(avg(rating)::numeric, 1),
         round(100.0 * avg((change = 'better')::int))::int, round(100.0 * avg(again::int))::int
  from reviews where product_id = p_product having count(*) >= 3;
$$;
grant execute on function peer_results(text) to anon, authenticated;

-- 정함 코치 에이전트 실행 기록(판단 과정과 행동). 본인만 읽기, 익명 사용자는 anon_id로만 저장
create table if not exists coach_runs (
  id bigint generated always as identity primary key,
  anon_id text not null,
  user_id uuid references auth.users on delete set null,
  mode text not null check (mode in ('llm','rules')),
  signals jsonb not null,
  steps jsonb not null,
  actions jsonb not null,
  outcome jsonb,
  created_at timestamptz default now()
);
alter table coach_runs enable row level security;
revoke all on coach_runs from anon, authenticated;
create or replace function log_coach_run(p_anon text, p_mode text, p_signals jsonb, p_steps jsonb, p_actions jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  if length(coalesce(p_anon, '')) < 8 then raise exception 'bad input'; end if;
  insert into coach_runs (anon_id, user_id, mode, signals, steps, actions) values (p_anon, auth.uid(), p_mode, p_signals, p_steps, p_actions) returning id into rid;
  return rid;
end $$;
grant execute on function log_coach_run(text,text,jsonb,jsonb,jsonb) to anon, authenticated;
create or replace function coach_outcome(p_anon text, p_id bigint, p_outcome jsonb) returns void
language sql security definer set search_path = public as $$
  update coach_runs set outcome = p_outcome where id = p_id and anon_id = p_anon;
$$;
grant execute on function coach_outcome(text,bigint,jsonb) to anon, authenticated;

-- 코치 자율 실행(매일 크론): 사용자가 연 것(user)과 에이전트가 먼저 연락한 것(auto)을 구분
alter table coach_runs add column if not exists trigger text not null default 'user' check (trigger in ('user','auto'));
create index if not exists coach_runs_auto_idx on coach_runs (user_id, created_at) where trigger = 'auto';

-- 권한(GRANT): 새 Supabase 프로젝트에서 public 테이블 권한이 자동으로 주어지지 않는 것을 확인함(2026-11-23).
-- 행 단위 접근은 위의 RLS 정책이 막고, 여기서는 역할별로 쓸 수 있는 작업만 연다.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on profiles, routines, checks, skin_logs, feedback, push_subs to authenticated;
grant insert on diagnoses, events to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to anon, authenticated, service_role;

-- 고민 상담 익명 통계: 대화 내용·사용자 ID 없이 숫자와 고민 분류만
create table if not exists counsel_stats (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('start','question','answer')),
  questions int, tool_calls int, concerns text[], red_flag boolean, doctor_needed boolean,
  product_count int, policy_fixes int, latency_ms int, calls int, tokens_in int, tokens_out int,
  created_at timestamptz default now()
);
alter table counsel_stats enable row level security;
revoke all on counsel_stats from anon, authenticated;
grant all on counsel_stats to service_role;

create or replace function counsel_stats_summary()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not exists (select 1 from admins where email = auth.jwt() ->> 'email') then
    raise exception 'not admin';
  end if;
  select jsonb_build_object(
    'starts', (select count(*) from counsel_stats where kind = 'start'),
    'answers', (select count(*) from counsel_stats where kind = 'answer'),
    'avgQuestions', (select round(avg(questions)::numeric, 2) from counsel_stats where kind = 'answer'),
    'doctorRate', (select round(avg(doctor_needed::int)::numeric, 3) from counsel_stats where kind = 'answer'),
    'productRate', (select round(avg((product_count > 0)::int)::numeric, 3) from counsel_stats where kind = 'answer'),
    'policyRate', (select round(avg((policy_fixes > 0)::int)::numeric, 3) from counsel_stats where kind = 'answer'),
    'p50ms', (select percentile_cont(0.5) within group (order by latency_ms) from counsel_stats where kind = 'answer'),
    'tokensIn', (select coalesce(sum(tokens_in), 0) from counsel_stats),
    'tokensOut', (select coalesce(sum(tokens_out), 0) from counsel_stats),
    'concerns', (select coalesce(jsonb_object_agg(c, n), '{}') from (select unnest(concerns) c, count(*) n from counsel_stats where kind = 'answer' group by 1) t)
  ) into r;
  return r;
end $$;
grant execute on function counsel_stats_summary() to authenticated;
-- 써본 사람 장단점: 정해진 태그 + 한 줄(100자). 기기당 제품 1개, 익명. 직접 읽기·쓰기는 막고 함수로만
create table if not exists product_notes (
  id bigint generated always as identity primary key,
  anon_id text not null,
  user_id uuid references auth.users on delete set null,
  product_id text not null,
  skin_type text check (skin_type in ('dry','oily','combo','normal')),
  used text not null check (used in ('week','month','long')),
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  comment text check (char_length(comment) <= 100),
  hidden boolean not null default false,
  created_at timestamptz default now(),
  unique (anon_id, product_id)
);
alter table product_notes enable row level security;
revoke all on product_notes from anon, authenticated;
grant all on product_notes to service_role;

create or replace function submit_note(p_anon text, p_product text, p_skin text, p_used text, p_pros text[], p_cons text[], p_comment text)
returns void language plpgsql security definer set search_path = public as $$
declare allowed_pros text[] := array['촉촉해요','끈적임 없어요','순해요','향이 거의 없어요','흡수가 빨라요','가성비 좋아요','면도 후에도 괜찮아요','백탁 없어요'];
  allowed_cons text[] := array['끈적여요','건조해요','따가웠어요','향이 세요','하얗게 떠요','트러블이 났어요','비싸요','눈이 시려요'];
  c text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if length(coalesce(p_anon, '')) < 8 or length(coalesce(p_product, '')) not between 6 and 20 then raise exception 'bad input'; end if;
  if not (p_pros <@ allowed_pros and p_cons <@ allowed_cons) then raise exception 'bad tag'; end if;
  if cardinality(p_pros) + cardinality(p_cons) = 0 or cardinality(p_pros) > 4 or cardinality(p_cons) > 4 then raise exception 'bad count'; end if;
  -- 링크·연락처가 든 한 줄은 저장하지 않음(광고·개인정보 방지)
  if c ~* '(https?://|www\.|\.com|\.kr|010[- ]?\d{3,4}|카톡|오픈채팅|@)' then c := null; end if;
  insert into product_notes (anon_id, user_id, product_id, skin_type, used, pros, cons, comment)
  values (p_anon, auth.uid(), p_product, nullif(p_skin, ''), p_used, p_pros, p_cons, left(c, 100))
  on conflict (anon_id, product_id) do update
    set pros = excluded.pros, cons = excluded.cons, comment = excluded.comment, used = excluded.used, skin_type = excluded.skin_type, created_at = now();
end $$;
grant execute on function submit_note(text,text,text,text,text[],text[],text) to anon, authenticated;

-- 제품별 집계: 태그 수 + 최근 한 줄 5개(작성자 정보 없이)
create or replace function product_notes_summary(p_product text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'n', (select count(*) from product_notes where product_id = p_product and not hidden),
    'pros', (select coalesce(jsonb_object_agg(t, k), '{}') from (select unnest(pros) t, count(*) k from product_notes where product_id = p_product and not hidden group by 1) x),
    'cons', (select coalesce(jsonb_object_agg(t, k), '{}') from (select unnest(cons) t, count(*) k from product_notes where product_id = p_product and not hidden group by 1) x),
    'recent', (select coalesce(jsonb_agg(r), '[]') from (select comment, skin_type, used, created_at::date d from product_notes where product_id = p_product and not hidden and comment is not null order by created_at desc limit 5) r)
  );
$$;
grant execute on function product_notes_summary(text) to anon, authenticated;
