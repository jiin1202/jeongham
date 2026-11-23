// 자율 실행 연락 규칙 점검: 평가 시나리오 15개에 대해 "먼저 연락할 이유"를 출력한다(GPT 호출 없음)
// 실행: python3 -c "import sys,json;sys.path.insert(0,'scripts/eval');from scenarios import SC;json.dump(SC,open('/tmp/sc.json','w'))"
//       npx tsx --tsconfig tsconfig.json scripts/eval/triggers.test.ts
import fs from "fs";
import { computeSignals } from "../../src/lib/coach/core";
import { pushTriggers } from "../../src/lib/coach/triggers";

const SC = JSON.parse(fs.readFileSync(process.argv[2] ?? "/tmp/sc.json", "utf8"));
for (const sc of SC) {
  const sig = computeSignals(sc.snap);
  console.log(sc.id, sc.title, "→", pushTriggers(sc.snap, sig).map((t) => t.label).join(" | ") || "(연락 안 함)");
}
