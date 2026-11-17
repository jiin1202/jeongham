// 스킨케어 가이드. 모든 문장은 아래 sources의 공개 자료를 근거로 정함이 쉽게 풀어 쓴 것.
// 조회일: 2026-11-17

export type Block = { h?: string; p?: string; list?: string[] };
export type Guide = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  body: Block[];
  cta?: { href: string; label: string };
  sources: { title: string; url: string }[];
};

export const guides: Guide[] = [
  {
    slug: "routine-order",
    title: "남자 스킨케어, 순서는 이것만 기억하세요",
    summary: "세안 → (토너) → 보습 → 선크림. 아침과 저녁에 다른 건 선크림 하나예요.",
    minutes: 3,
    body: [
      { p: "제품이 많아질수록 순서가 헷갈리지만 기본은 단순해요. 묽은 것에서 진한 것 순서로 바르고, 아침엔 마지막에 선크림을 바르면 돼요." },
      {
        h: "아침",
        list: [
          "세안: 미지근한 물로 얼굴을 적시고 손끝으로 세안제를 문질러요. 수건이나 스펀지로 문지르면 자극이 될 수 있어요.",
          "토너(선택): 세안 후 당기면 써요. 안 당기면 건너뛰어도 괜찮아요.",
          "보습: 로션이나 크림, 올인원 중 하나면 충분해요.",
          "선크림: 맨 마지막에 발라요. 실내에만 있어도 바르는 습관이 좋아요.",
        ],
      },
      {
        h: "저녁",
        list: ["세안: 선크림까지 씻어내요.", "토너(선택)", "세럼(선택): 고민 케어용 제품은 이때 써요.", "보습"],
      },
      { h: "세안은 하루 두 번이면 돼요", p: "미국피부과학회(AAD)는 아침·저녁 두 번, 그리고 땀을 많이 흘린 뒤에 세안하라고 권해요. 모자나 헬멧을 쓰고 흘린 땀은 피부를 자극할 수 있어요. 더 자주 씻는다고 좋아지지 않아요." },
      { h: "처음이면 3단계부터", p: "세안제, 올인원, 선크림 세 가지로 시작해도 충분해요. 2~3주 써보고 건조하거나 고민이 남으면 그때 한 단계씩 더해요." },
    ],
    cta: { href: "/check/", label: "내 피부에 맞는 3단계 정하기" },
    sources: [{ title: "AAD, Face washing 101", url: "https://www.aad.org/public/everyday-care/skin-care-basics/care/face-washing-101" }],
  },
  {
    slug: "after-shave",
    title: "면도할 때마다 따갑다면",
    summary: "면도는 도구보다 준비와 방법이 더 중요해요. 피부과 전문의가 권하는 순서대로 정리했어요.",
    minutes: 3,
    body: [
      { h: "면도 전", list: ["피부와 수염을 물로 충분히 적셔요. 샤워 직후가 가장 좋아요.", "면도 크림이나 젤을 발라요. 건조하거나 예민하면 '민감 피부용' 표기를 확인하세요."] },
      {
        h: "면도할 때",
        list: [
          "수염이 자라는 방향으로 밀어요. 인그로운 헤어와 면도 트러블을 줄이는 데 중요해요.",
          "한 번 밀 때마다 면도날을 헹궈요.",
          "같은 부위는 두 번 넘게 지나가지 않아요.",
          "여드름이 난 곳은 가볍게 지나가고, 여드름을 깎아내려 하지 마세요.",
        ],
      },
      { h: "면도 후", list: ["물로 헹구고 깨끗한 수건으로 두드려 말려요.", "판테놀, 병풀(시카), 알란토인처럼 진정 성분이 든 보습제를 발라요.", "향료나 에탄올이 앞쪽에 있는 애프터셰이브는 예민하면 따가울 수 있어요."] },
      { h: "면도날 교체", p: "AAD는 날을 갈거나 일회용 면도기를 버리는 주기로 5~7회 사용을 권해요. 무딘 날은 자극을 늘려요." },
      { h: "면도 트러블이 잦다면", p: "AAD는 면도 트러블이 잦으면 매일, 적어도 2~3일에 한 번 면도하라고 권해요. 수염이 길게 자라 피부 안으로 말려 들어갈 시간을 줄이기 위해서예요. 계속되면 피부과 진료를 받아보세요." },
    ],
    cta: { href: "/products/?c=moisturizer", label: "진정 성분 보습제 보기" },
    sources: [
      { title: "AAD, Hair removal: How to shave", url: "https://www.aad.org/public/everyday-care/skin-care-basics/hair/how-to-shave" },
      { title: "AAD, Razor bump remedies", url: "https://www.aad.org/public/everyday-care/skin-care-basics/hair/razor-bump-remedies" },
    ],
  },
  {
    slug: "sunscreen",
    title: "선크림, 끈적임 없이 고르는 법",
    summary: "SPF·PA 숫자보다 매일 바를 수 있는 제형이 먼저예요. 무기자차와 유기자차 차이도 정리했어요.",
    minutes: 4,
    body: [
      { h: "숫자는 이 정도면 충분해요", p: "AAD는 SPF 30 이상, 자외선A·B를 모두 막는(broad spectrum) 제품을 권해요. SPF 30은 UVB의 약 97%를 막아요. 국내 제품은 자외선A 차단 정도를 PA 등급(PA+ ~ PA++++)으로 표시해요." },
      { h: "다시 바르기", p: "밖에 오래 있으면 약 2시간마다, 땀을 많이 흘렸거나 물에 들어갔다 나오면 바로 다시 발라요." },
      {
        h: "무기자차와 유기자차",
        list: [
          "무기자차(징크옥사이드, 티타늄디옥사이드): 빛을 반사해요. 눈 시림이 덜한 편이지만 하얗게 뜨는 백탁이 생길 수 있어요.",
          "유기자차: 빛을 흡수해요. 백탁이 적고 가볍지만 눈가에 닿으면 시릴 수 있어요.",
          "혼합자차: 두 방식을 섞어 단점을 줄인 타입이에요.",
        ],
      },
      {
        h: "싫은 점으로 고르기",
        list: ["끈적임이 싫다면: 젤·플루이드·세럼 제형", "백탁이 싫다면: 유기자차나 혼합자차", "눈 시림이 싫다면: 무기자차, 또는 스틱형으로 눈가를 피해서", "덧바르기 귀찮다면: 스틱형"],
      },
      { p: "정함 진단에서 '선크림이 싫은 이유'를 고르면 이 기준대로 제품을 골라드려요. 제품 상세 페이지에서 자외선 차단 방식도 확인할 수 있어요." },
    ],
    cta: { href: "/products/?c=sun", label: "선크림 비교하기" },
    sources: [
      { title: "AAD, Sunscreen FAQs", url: "https://www.aad.org/media/stats-sunscreen" },
      { title: "AAD, How to decode sunscreen labels", url: "https://www.aad.org/public/everyday-care/sun-protection/sunscreen/understand-sunscreen-labels" },
    ],
  },
  {
    slug: "trouble-ingredients",
    title: "트러블 성분, 화장품으로 할 수 있는 것과 없는 것",
    summary: "화장품은 여드름을 치료하지 않아요. 도움이 되는 성분과, 병원에 가야 할 때를 정리했어요.",
    minutes: 4,
    body: [
      { h: "먼저 알아둘 것", p: "식약처는 여드름 관련 화장품이 치료제가 아니라고 안내해요. 기능성화장품은 '여드름성 피부 완화에 도움'을 줄 뿐이고, 이 기능성은 폼 클렌저처럼 씻어내는 제품에만 인정돼요. 주성분으로는 살리실산이 가장 많이 쓰여요." },
      { h: "기능성 표시 확인", p: "제품 포장에서 '기능성화장품' 문구를 확인하고, 의약품안전나라 누리집에서 기능성화장품 심사·보고 품목을 검색해 볼 수 있어요. '여드름 치료' 같은 표현은 허위·과장 광고일 수 있어요." },
      {
        h: "써볼 만한 성분",
        list: [
          "살리실산(BHA): 각질과 피지를 정리해요. 국내에선 여드름성 피부 완화 기능성 세안제에 들어가요.",
          "나이아신아마이드, 징크: 피지·번들거림 케어에 흔히 쓰여요.",
          "병풀(시카), 판테놀: 자극받은 피부를 진정시키는 데 쓰여요.",
        ],
      },
      { h: "시간을 주세요", p: "AAD는 새 트러블 제품을 최소 4주는 써보라고 권해요. 며칠마다 제품을 바꾸면 오히려 피부가 자극받을 수 있어요. 한두 개만 골라 꾸준히 쓰는 게 나아요." },
      { h: "병원에 가야 할 때", list: ["깊고 아픈 여드름(결절, 낭종)이 생길 때", "흉터가 남을 때", "시중 제품을 꾸준히 써도 나아지지 않을 때"] },
    ],
    cta: { href: "/check/", label: "트러블 고민으로 루틴 정하기" },
    sources: [
      { title: "식품의약품안전처, 여드름 화장품은 치료제가 아닙니다 (2025.5.)", url: "https://www.korea.kr/news/policyNewsView.do?newsId=148943223" },
      { title: "AAD, 9 things to try when acne won't clear", url: "https://www.aad.org/public/diseases/acne/diy/wont-clear" },
    ],
  },
  {
    slug: "retinol-101",
    title: "레티놀, 처음 쓴다면 이렇게",
    summary: "적게, 드물게, 저녁에. 레티놀 입문자가 피부를 덜 괴롭히는 방법이에요.",
    minutes: 3,
    body: [
      { p: "레티놀 같은 레티노이드는 피부결과 탄력 케어에 쓰이지만, 처음엔 건조하거나 따가울 수 있어요. 천천히 늘리는 게 핵심이에요." },
      {
        h: "시작하는 법",
        list: [
          "저녁에만 써요.",
          "처음엔 주 2회나 이틀에 한 번으로 시작하고, 괜찮으면 천천히 횟수를 늘려요.",
          "얼굴 전체에 완두콩 한 알 크기면 충분해요. 횟수를 늘려도 양은 늘리지 않아요.",
          "바른 뒤엔 보습제를 발라요.",
          "다음 날 아침엔 선크림을 꼭 발라요.",
        ],
      },
      { h: "같이 쓰지 않는 게 좋은 것", p: "AHA·BHA 같은 각질 케어 제품과 같은 날 쓰면 자극이 겹칠 수 있어요. 정함의 '쓰는 제품 검사'에 넣으면 겹치는 조합을 알려드려요." },
      { h: "멈춰야 할 때", p: "붉어짐이나 따가움이 며칠 이어지면 횟수를 줄이거나 쉬어요. 계속되면 피부과 전문의와 상담하세요." },
    ],
    cta: { href: "/mine/", label: "쓰는 제품끼리 겹치는지 검사" },
    sources: [{ title: "UNC Health, Frequently Asked Questions About Retinoids", url: "https://healthtalk.unchealthcare.org/frequently-asked-questions-about-retinoids/" }],
  },
];

export const guideBySlug = new Map(guides.map((g) => [g.slug, g]));
