// 성분 사전 – 화장품 전성분(국문 표기)에서 효능·주의 성분을 찾는 규칙.
// 기준: 식약처 기능성 고시 원료, 대한피부과학회·미국피부과학회(AAD) 등이 일반적으로 안내하는 사용 가이드.
// 한 성분이 여러 그룹에 속할 수 있음. match는 전성분 항목에 '포함'되면 일치.

export type IngGroup =
  | "bha" | "aha" | "pha" | "retinoid" | "vitc" | "niacinamide" | "tranexamic" | "arbutin" | "glutathione"
  | "cica" | "panthenol" | "allantoin" | "betaglucan" | "teatree" | "houttuynia" | "zinc" | "clay"
  | "hyaluronic" | "ceramide" | "squalane" | "butter" | "occlusive" | "peptide" | "adenosine" | "pdrn"
  | "fragrance" | "allergen" | "alcohol" | "essentialoil" | "menthol"
  | "uv_mineral" | "uv_chemical";

export interface GroupInfo {
  label: string;
  kind: "benefit" | "caution" | "uv";
  match: string[];
  exclude?: string[];
  note: string;
}

export const GROUPS: Record<IngGroup, GroupInfo> = {
  bha: { label: "BHA(살리실산)", kind: "benefit", match: ["살리실릭애씨드", "베타인살리실레이트", "카프릴로일살리실릭애씨드", "윌로우껍질추출물"], note: "모공 속 피지·각질 정리. 국내에선 여드름성 피부 완화 기능성은 씻어내는 제품에만 인정되고, 일반 화장품엔 보존제 용도로 소량만 쓸 수 있어요." },
  aha: { label: "AHA", kind: "benefit", match: ["글라이콜릭애씨드", "락틱애씨드", "만델릭애씨드"], note: "표면 각질 정리. 햇빛에 예민해질 수 있어 선크림이 필수예요." },
  pha: { label: "PHA", kind: "benefit", match: ["글루코노락톤", "락토바이오닉애씨드"], note: "AHA보다 순한 각질 케어 성분이에요." },
  retinoid: { label: "레티노이드", kind: "benefit", match: ["레티놀", "레티날", "레티닐팔미테이트", "하이드록시피나코론레티노에이트", "레티닐레티노에이트"], note: "피부결·탄력 개선. 저녁에 쓰고, 각질 제거 성분과 같은 날 겹치지 않는 게 좋아요." },
  vitc: { label: "비타민C", kind: "benefit", match: ["아스코빅애씨드", "아스코빌글루코사이드", "에틸아스코빅애씨드", "아스코빌포스페이트", "아스코빌테트라이소팔미테이트"], exclude: ["소듐아스코빌포스페이트 "], note: "톤·광채 케어. 순수 비타민C는 각질 제거 성분과 같은 시간대에 겹치면 따가울 수 있어요." },
  niacinamide: { label: "나이아신아마이드", kind: "benefit", match: ["나이아신아마이드"], note: "식약처 고시 미백 기능성 원료. 피지·톤 케어에 두루 쓰여요." },
  tranexamic: { label: "트라넥삼산", kind: "benefit", match: ["트라넥사믹애씨드"], note: "잡티·흔적 케어 성분이에요." },
  arbutin: { label: "알부틴", kind: "benefit", match: ["알부틴"], note: "식약처 고시 미백 기능성 원료예요." },
  glutathione: { label: "글루타치온", kind: "benefit", match: ["글루타치온"], note: "톤 케어 소구 성분이에요." },
  cica: { label: "병풀(시카)", kind: "benefit", match: ["병풀", "마데카소사이드", "아시아티코사이드", "마데카식애씨드", "아시아틱애씨드", "센텔라"], note: "자극받은 피부 진정에 흔히 쓰여요." },
  panthenol: { label: "판테놀", kind: "benefit", match: ["판테놀"], note: "보습·진정, 면도 후 자극 완화에 좋아요." },
  allantoin: { label: "알란토인", kind: "benefit", match: ["알란토인"], note: "진정 성분이에요." },
  betaglucan: { label: "베타글루칸", kind: "benefit", match: ["베타-글루칸", "베타글루칸"], note: "보습·진정 성분이에요." },
  teatree: { label: "티트리", kind: "benefit", match: ["티트리"], note: "트러블 케어 소구 성분이에요. 정유 형태는 예민하면 자극될 수 있어요." },
  houttuynia: { label: "어성초", kind: "benefit", match: ["약모밀추출물", "어성초"], note: "진정·트러블 케어 소구 성분이에요." },
  zinc: { label: "징크", kind: "benefit", match: ["징크피씨에이", "징크글루코네이트", "징크설페이트"], note: "피지 조절 소구 성분이에요." },
  clay: { label: "클레이", kind: "benefit", match: ["카올린", "벤토나이트", "화산송이"], note: "피지 흡착. 건성은 당길 수 있어요." },
  hyaluronic: { label: "히알루론산", kind: "benefit", match: ["하이알루로닉애씨드", "하이알루로네이트"], note: "수분을 끌어당겨 속건조에 좋아요." },
  ceramide: { label: "세라마이드", kind: "benefit", match: ["세라마이드"], note: "피부 장벽을 채워 건조·예민에 좋아요." },
  squalane: { label: "스쿠알란", kind: "benefit", match: ["스쿠알란"], note: "가벼운 오일 보습 성분이에요." },
  butter: { label: "버터·오일 보습", kind: "benefit", match: ["시어버터", "망고씨버터", "호호바씨오일", "마카다미아씨오일", "올리브오일"], note: "보습력이 높아 건성엔 좋고 지성엔 무거울 수 있어요." },
  occlusive: { label: "밀폐 보습", kind: "benefit", match: ["페트롤라툼", "미네랄오일", "다이메티콘"], exclude: ["다이메티콘/"], note: "수분 증발을 막는 성분. 지성은 답답할 수 있어요." },
  peptide: { label: "펩타이드", kind: "benefit", match: ["펩타이드"], note: "탄력 케어 소구 성분이에요." },
  adenosine: { label: "아데노신", kind: "benefit", match: ["아데노신"], note: "식약처 고시 주름 개선 기능성 원료예요." },
  pdrn: { label: "PDRN", kind: "benefit", match: ["소듐디엔에이", "피디알엔", "폴리디옥시리보뉴클레오타이드"], note: "재생·탄력 소구 성분이에요." },
  fragrance: { label: "향료", kind: "caution", match: ["향료"], note: "예민한 피부에선 자극 원인이 되기도 해요." },
  allergen: { label: "알레르기 유발 향 성분", kind: "caution", match: ["리모넨", "리날룰", "시트랄", "제라니올", "유제놀", "시트로넬올", "쿠마린", "벤질알코올", "헥실신남알"], note: "식약처 표시 의무 알레르기 유발 성분이에요. 예민하면 확인하세요." },
  alcohol: { label: "에탄올", kind: "caution", match: ["에탄올", "변성알코올", "알코올"], exclude: ["벤질알코올", "세테아릴알코올", "세틸알코올", "스테아릴알코올", "베헤닐알코올", "라놀린알코올", "페네틸알코올", "아라키딜알코올", "카프릴릴알코올"], note: "앞쪽에 있으면 건조하거나 예민한 피부엔 따가울 수 있어요." },
  essentialoil: { label: "에센셜 오일", kind: "caution", match: ["잎오일", "꽃오일", "껍질오일", "라벤더오일", "페퍼민트오일", "로즈마리잎오일", "유칼립투스잎오일", "레몬오일", "베르가모트"], note: "향을 내는 식물 정유. 예민하면 자극될 수 있어요." },
  menthol: { label: "멘톨", kind: "caution", match: ["멘톨", "멘틸락테이트"], note: "쿨링감을 주지만 예민하면 화끈거릴 수 있어요." },
  uv_mineral: { label: "무기자차 필터", kind: "uv", match: ["징크옥사이드", "티타늄디옥사이드"], note: "빛을 반사·산란. 눈 시림이 덜한 편이지만 백탁이 생길 수 있어요." },
  uv_chemical: { label: "유기자차 필터", kind: "uv", match: ["에틸헥실메톡시신나메이트", "에칠헥실메톡시신나메이트", "호모살레이트", "옥토크릴렌", "에틸헥실살리실레이트", "에칠헥실살리실레이트", "비스-에틸헥실옥시페놀메톡시페닐트리아진", "비스-에칠헥실옥시페놀메톡시페닐트리아진", "다이에틸아미노하이드록시벤조일헥실벤조에이트", "디에칠아미노하이드록시벤조일헥실벤조에이트", "에틸헥실트라이아존", "에칠헥실트리아존", "부틸메톡시다이벤조일메탄", "부틸메톡시디벤조일메탄", "폴리실리콘-15", "메틸렌비스-벤조트라이아졸릴테트라메틸부틸페놀", "메칠렌비스-벤조트리아졸릴테트라메칠부틸페놀", "드로메트리졸트라이실록세인", "테레프탈릴리덴다이캠퍼설포닉애씨드", "이소아밀p-메톡시신나메이트"], note: "빛을 흡수. 백탁이 적고 가볍지만 눈가에 닿으면 시릴 수 있어요." },
};

export type Hit = { group: IngGroup; ing: string; pos: number };

export function splitIngredients(raw: string): string[] {
  return raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\n/g, ",")
    .split(/,(?![^()]*\))(?!\d)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function analyze(ings: string[]): Hit[] {
  const hits: Hit[] = [];
  ings.forEach((ing, pos) => {
    const clean = ing.replace(/\s/g, "");
    (Object.keys(GROUPS) as IngGroup[]).forEach((g) => {
      const info = GROUPS[g];
      if (info.exclude?.some((x) => clean.includes(x.trim().replace(/\s/g, "")))) return;
      if (g === "alcohol" && !/^(에탄올|변성알코올|알코올)/.test(clean)) return;
      if (info.match.some((m) => clean.includes(m.replace(/\s/g, "")))) hits.push({ group: g, ing, pos });
    });
  });
  return hits;
}
