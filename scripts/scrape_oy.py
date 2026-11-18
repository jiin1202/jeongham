"""올리브영 랭킹·카테고리 목록 → 상품정보 고시(전성분 등) 수집. GitHub Actions에서 실행.
사용: python scripts/scrape_oy.py out.json [max_items]
- 이미 products.json에 있는 goodsNo는 건너뜀
- 요청 간격 6초, 429 응답 시 5분 대기
"""
import json, re, sys, time, html
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError

BASE = "https://www.oliveyoung.co.kr"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
H = {"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", "Referer": BASE + "/store/main/main.do"}
EX = re.compile(r"톤업|쌩얼|커버|쿠션|틴티드|바디|미스트|패드|마스크|리무버|H2O|워시필|필링|샴푸|헤어|립|핸드|데오|향수|퍼퓸|면도기|왁스|포마드|스프레이|키트|세트 [2-9]종|체험|아이크림|아이 크림|베이비|키즈|유아")

def get(url, data=None, tries=4):
    for t in range(tries):
        try:
            req = Request(url, data=urlencode(data).encode() if data else None, headers={**H, **({"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest"} if data else {})})
            with urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except HTTPError as e:
            print("HTTP", e.code, url[:90], flush=True)
            if e.code == 429:
                time.sleep(300)
            else:
                time.sleep(10)
        except Exception as e:
            print("ERR", e, flush=True)
            time.sleep(10)
    return ""

def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()

def parse_list(page, src):
    out = []
    for i, blk in enumerate(re.findall(r'<div class="prd_info ?[^"]*">(.*?)</p>\s*</div>', page, re.S)):
        g = re.search(r'data-ref-goodsno="(A\d{12})"', blk)
        if not g: continue
        img = re.search(r'/(A\d{12})(\d\d)ko\.(jpg|png)', blk)
        def f(cls):
            m = re.search(r'class="%s[^"]*"[^>]*>(.*?)</' % cls, blk, re.S)
            return text(m.group(1)) if m else ""
        out.append({"g": g.group(1), "src": src, "rank": i + 1, "brand": f("tx_brand"), "name": f("tx_name"),
                    "org": f("tx_org"), "cur": f("tx_cur"), "img": (img.group(2) + img.group(3)[0]) if img and img.group(1) == g.group(1) else ""})
    return out

def main():
    outp = sys.argv[1]; maxn = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
    have = {p["goodsNo"] for p in json.load(open("src/data/products.json"))}
    try:
        prev = json.load(open(outp))
    except Exception:
        prev = {"q": [], "d": {}}
    seen = set(have) | {x["g"] for x in prev["q"]}
    q = prev["q"]
    lists = [("skin", f"{BASE}/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010001&pageIdx=1&rowsPerPage=100"),
             ("cleanse", f"{BASE}/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010010&pageIdx=1&rowsPerPage=100"),
             ("sun", f"{BASE}/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000010011&pageIdx=1&rowsPerPage=100"),
             ("men", f"{BASE}/store/main/getBestList.do?dispCatNo=900000100100001&fltDispCatNo=10000060002&pageIdx=1&rowsPerPage=100")]
    for src, c in [("toner", "100000100010013"), ("serum", "100000100010014"), ("cream", "100000100010015"), ("lotion", "100000100010016"),
                   ("foam", "100000100100001"), ("sun", "100000100110006"), ("stick", "100000100110003")]:
        for pg in (1, 2):
            lists.append((src, f"{BASE}/store/display/getMCategoryList.do?dispCatNo={c}&fltDispCatNo=&prdSort=01&pageIdx={pg}&rowsPerPage=48"))
    if not prev["q"]:
        for src, url in lists:
            page = get(url)
            items = parse_list(page, src)
            print(src, len(items), flush=True)
            for it in items:
                if it["g"] in seen or EX.search(it["name"]): continue
                seen.add(it["g"]); q.append(it)
            time.sleep(3)
    print("queue", len(q), flush=True)
    d = prev["d"]; n = 0
    for it in q:
        if it["g"] in d: continue
        if n >= maxn: break
        page = get(BASE + "/store/goods/getGoodsArtcAjax.do", {"goodsNo": it["g"], "itemNo": "001", "pkgGoodsYn": "N"})
        o = {}
        for dt, dd in re.findall(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", page, re.S):
            o[text(dt)] = text(dd)
        d[it["g"]] = o; n += 1
        if n % 20 == 0:
            json.dump({"q": q, "d": d}, open(outp, "w"), ensure_ascii=False)
            print("detail", len(d), flush=True)
        time.sleep(6)
    json.dump({"q": q, "d": d}, open(outp, "w"), ensure_ascii=False)
    print("done", len(q), len(d), sum(1 for v in d.values() if v), flush=True)

main()
