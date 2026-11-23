"""정함 코치 시뮬레이션 평가 실행기.

사용법 (저장소 루트에서):
  1) .env.local 에 OPENAI_API_KEY 를 넣고 `npm run dev` 로 로컬 서버 실행
  2) python3 scripts/eval/run.py http://localhost:3000 3
     -> 시나리오 15개 x 3회 실행, 결과는 scripts/eval/result_<시각>.json

키가 없으면 서버가 규칙 플래너(mode=rules)로 답하므로 결과의 mode 를 꼭 확인한다.
데이터는 모두 가상의 사용자 기록(시뮬레이션)이다.
"""
import json, sys, time, statistics, urllib.request, pathlib, datetime
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from scenarios import SC, grade

base = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")
reps = int(sys.argv[2]) if len(sys.argv) > 2 else 3

rows = []
for sc in SC:
    for rep in range(reps):
        t = time.time()
        req = urllib.request.Request(base + "/api/coach/", data=json.dumps(sc["snap"]).encode(),
                                     headers={"content-type": "application/json"})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            rows.append({"id": sc["id"], "rep": rep, "error": str(e)}); print(sc["id"], "ERROR", e); continue
        ms = int((time.time() - t) * 1000)
        miss, viol = grade(sc, r.get("actions", []))
        tools = sum(1 for s in r.get("steps", []) if s.get("kind") == "tool")
        rows.append({"id": sc["id"], "rep": rep, "mode": r.get("mode"), "ms": ms, "tools": tools,
                     "actions": r.get("actions"), "steps": r.get("steps"), "miss": miss, "viol": viol})
        print(f'{sc["id"]} #{rep} {r.get("mode")} {ms}ms tools={tools} miss={miss} viol={viol}')

ok = [x for x in rows if "error" not in x]
passed = sum(1 for x in ok if not x["miss"] and not x["viol"])
ms = sorted(x["ms"] for x in ok)
summary = {
    "runs": len(rows), "errors": len(rows) - len(ok),
    "modes": {m: sum(1 for x in ok if x["mode"] == m) for m in {x["mode"] for x in ok}},
    "pass": passed, "pass_rate": round(passed / max(len(ok), 1), 3),
    "violations": sum(len(x["viol"]) for x in ok), "misses": sum(len(x["miss"]) for x in ok),
    "tool_use_rate": round(sum(1 for x in ok if x["tools"]) / max(len(ok), 1), 3),
    "p50_ms": statistics.median(ms) if ms else None, "p90_ms": ms[int(len(ms) * 0.9) - 1] if ms else None,
}
print(json.dumps(summary, ensure_ascii=False, indent=1))
out = pathlib.Path(__file__).parent / f"result_{datetime.datetime.now():%Y%m%d_%H%M}.json"
out.write_text(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=1))
print("saved", out)
