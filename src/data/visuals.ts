// 사이트에 쓰는 AI 생성 이미지 목록(운영자 페이지에서 만들고 Supabase media/gen에 저장).
// 원칙: 실존 브랜드·포장·로고·글자를 그리지 않는다. 효과를 보여주는 비포·애프터는 만들지 않는다(허위·오인 광고 소지).
export type Visual = { name: string; where: string; size: "1536x1024" | "1024x1536" | "1024x1024"; alt: string; prompt: string };

// 사람·장소를 컷마다 다르게(여러 사용자가 쓰는 느낌). 현실감은 유지하되 너무 거칠지 않게: 보정 없는 자연스러운 피부, 작은 뾰루지 1~2개 정도
const LOOK =
  "Natural-looking realistic photo taken on a phone, pleasant and clean composition, soft natural light, real unretouched skin with visible pores and one or two small mild blemishes, not glossy, not an advertisement, no text, no logos, no brand names, unlabeled plain containers only.";
const guy = (who: string) => `an ordinary Korean man in his early 20s (not a model), ${who}, upper body only, framed from the chest up`;

export const VISUALS: Visual[] = [
  { name: "hero-morning", where: "홈 첫 화면", size: "1536x1024", alt: "아침에 거울 앞에서 보습제를 바르는 20대 남성", prompt: `${guy("soft round face, thick black hair with a natural fringe, plain white t-shirt")}, at the bathroom mirror of his small apartment in the morning, applying a little white lotion to his cheek with his fingertips, relaxed slightly sleepy expression, white tiles and a pale yellow towel behind him. ${LOOK}` },
  { name: "step-wash", where: "가이드: 세안", size: "1024x1024", alt: "헬스장 세면대에서 거품 세안을 하는 남성", prompt: `${guy("wavy permed dark brown hair, athletic build, grey sleeveless training shirt")}, washing his face with white foam at a sink in a gym locker room after a workout, eyes closed, water droplets, lockers softly blurred behind. ${LOOK}` },
  { name: "step-moist", where: "가이드: 보습", size: "1024x1024", alt: "기숙사 책상 거울 앞에서 보습제를 콕콕 올린 남성", prompt: `${guy("slim face, two-block haircut with short sides, black round glasses pushed up on his head, navy hoodie")}, sitting at a dormitory desk in front of a small stand mirror, small dots of white moisturizer on his forehead, cheeks, nose and chin about to spread it, laptop and books slightly blurred. ${LOOK}` },
  { name: "step-sun", where: "가이드: 선크림", size: "1024x1024", alt: "외출 전 현관에서 선크림을 손가락 두 마디만큼 짜는 남성", prompt: `${guy("lightly tanned skin, short sporty hair, holding a baseball cap under his arm, olive jacket")}, standing at the front door entrance of an apartment before going out, squeezing a line of white sunscreen along the length of his index and middle fingers from a plain unlabeled tube, sneakers and shoe rack in the background, bright morning light from the door. ${LOOK}` },
  { name: "after-shave", where: "가이드: 면도 후", size: "1024x1024", alt: "면도 후 손바닥으로 진정 제품을 눌러 바르는 남성", prompt: `${guy("slightly fuller face, very short buzz cut, light stubble shadow on part of his jaw, black t-shirt")}, in a bathroom with light blue tiles, gently pressing a clear gel onto his freshly shaved jaw and chin with both palms (no rubbing), a plain razor on the sink edge. ${LOOK}` },
  { name: "counsel", where: "고민 상담", size: "1536x1024", alt: "카페 창가에서 휴대폰으로 피부 고민을 찾아보는 남성", prompt: `${guy("medium-length curtain bangs parted in the middle, beige knit sweater")}, sitting at a cafe window seat with an iced americano, looking at his smartphone with a curious thoughtful look, lightly touching his chin, street softly blurred outside, warm daylight, screen content not visible. ${LOOK}` },
  { name: "check-log", where: "피부 기록", size: "1024x1024", alt: "학교 화장실 거울 앞에서 피부를 살펴보는 남성", prompt: `${guy("neat side-parted black hair, white oxford shirt with a backpack strap on one shoulder")}, leaning toward a mirror in a clean university restroom, checking a spot on his cheek, calm neutral expression, fluorescent and window light. ${LOOK}` },
  { name: "evening", where: "저녁 루틴·알림", size: "1536x1024", alt: "밤에 세안 후 휴대폰 알림을 확인하는 남성", prompt: `${guy("short military-style haircut, grey sweatshirt, towel around his neck")}, at night in a shared dormitory washroom with warm lighting after washing his face, glancing at a phone propped on the shelf showing a calendar reminder (no readable text), three plain unlabeled skincare bottles in a row. ${LOOK}` },
];

export const mediaUrl = (name: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/media/gen/${name}.webp`;
