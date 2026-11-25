// 사이트에 쓰는 AI 생성 이미지 목록(운영자 페이지에서 만들고 Supabase media/gen에 저장).
// 원칙: 실존 브랜드·포장·로고·글자를 그리지 않는다. 효과를 보여주는 비포·애프터는 만들지 않는다(허위·오인 광고 소지).
export type Visual = { name: string; where: string; size: "1536x1024" | "1024x1536" | "1024x1024"; alt: string; prompt: string };

// 현실감: 모델이 아닌 평범한 대학생, 앞머리가 이마를 덮는 자연스러운 머리, 작은 뾰루지·피부 결이 그대로 보이게
const STYLE =
  "Candid realistic smartphone photo, not a studio or advertising shot, ordinary small Korean apartment bathroom with white tiles, a pale yellow towel, everyday clutter slightly out of focus, natural window light mixed with indoor light, unretouched real skin: visible pores, slight oiliness on the nose, uneven skin tone, no beauty filter, no airbrushing, no text, no logos, no brand names, unlabeled plain containers only.";
const MAN =
  "an ordinary Korean university student in his early 20s (not a model, average looks), thick natural black hair with a soft fringe covering most of his forehead, slightly messy, a few small red pimples on his chin and one on his cheek, wearing a plain grey or white cotton t-shirt, upper body only, framed from the chest up";

export const VISUALS: Visual[] = [
  { name: "hero-morning", where: "홈 첫 화면", size: "1536x1024", alt: "아침에 거울 앞에서 보습제를 바르는 20대 남성", prompt: `${MAN}, standing at a bathroom mirror in the morning, gently applying a small amount of white lotion to his cheek with his fingertips, relaxed, slightly sleepy morning expression. ${STYLE}` },
  { name: "step-wash", where: "가이드: 세안", size: "1024x1024", alt: "미지근한 물로 거품 세안을 하는 남성", prompt: `${MAN}, washing his face with soft white foam over a sink, eyes closed, water droplets, gentle motion. ${STYLE}` },
  { name: "step-moist", where: "가이드: 보습", size: "1024x1024", alt: "얼굴 다섯 군데에 보습제를 콕콕 올리는 남성", prompt: `${MAN}, facing the camera, small dots of white moisturizer placed on forehead, both cheeks, nose and chin, about to spread it, holding a plain unlabeled white tube. ${STYLE}` },
  { name: "step-sun", where: "가이드: 선크림", size: "1024x1024", alt: "선크림을 손가락 두 마디 길이만큼 짜는 남성", prompt: `${MAN}, looking down at his hand, squeezing a line of white sunscreen along the length of his index and middle fingers (two-finger rule), from a plain unlabeled tube, before going out. ${STYLE}` },
  { name: "after-shave", where: "가이드: 면도 후", size: "1024x1024", alt: "면도 후 진정 제품을 손바닥으로 눌러 바르는 남성", prompt: `${MAN}, freshly shaved jawline, gently pressing a clear gel onto his jaw and chin with his palms (no rubbing), a razor resting by the sink in the background. ${STYLE}` },
  { name: "counsel", where: "고민 상담", size: "1536x1024", alt: "휴대폰을 보며 피부 고민을 확인하는 남성", prompt: `${MAN}, sitting on a bed in a bright simple room, looking at his smartphone with a curious thoughtful expression, lightly touching his chin with the other hand. Messy everyday dorm room, pale yellow pillow, natural window light. Candid realistic smartphone photo, unretouched skin with small pimples, no beauty filter, no text, no logos, screen content not visible.` },
  { name: "check-log", where: "피부 기록", size: "1024x1024", alt: "거울 앞에서 피부 상태를 살펴보는 남성", prompt: `${MAN}, leaning slightly toward a bathroom mirror, checking his skin on his cheek in natural light, calm neutral expression. ${STYLE}` },
  { name: "evening", where: "저녁 루틴·알림", size: "1536x1024", alt: "저녁에 루틴을 마치고 휴대폰 알림을 확인하는 남성", prompt: `${MAN}, in the evening at a bathroom sink with warm lighting, towel around his neck after washing his face, glancing at a phone propped on the shelf, three plain unlabeled skincare bottles in a row. Candid realistic smartphone photo, unretouched skin with small pimples, no beauty filter, no text, no logos.` },
];

export const mediaUrl = (name: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/media/gen/${name}.webp`;
