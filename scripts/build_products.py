"""올리브영 수집 원본(raw.json) → src/data/products.json 변환.
raw_min.json: {"q": [[goodsNo,cat,src,rank,brand,name,org,cur,men],...], "d": {goodsNo: {v:용량, s:주요사양, i:전성분, f:기능성, m:제조업자}}}
"""
import json, re, sys
src = json.load(open(sys.argv[1]))
MEN = {  # 맨즈에딧 랭킹(2026-11-17)에서 확인한 이름·가격
 "A000000230522": ("토리든","[단독기획/수분충전] 토리든 다이브인 포맨 저분자 히알루론산 올인원 200g 더블 기획","38,000원","29,900원"),
 "A000000223781": ("닥터지","[트러블/면도후] 닥터지 레드 블레미쉬 포 맨 진정 올인원 150ml 2종 (단품/증정 기획)","32,000원 ~","21,900원 ~"),
 "A000000117541": ("우르오스","[베스트 올인원]우르오스 올인원 200ml 2종 택 1","29,700원 ~","23,230원 ~"),
 "A000000230537": ("오브제","[덱스PICK/모공쿨링 올인원] 오브제 포어 제로 프레쉬 올인원 150ml 단품/기획","28,000원 ~","19,500원 ~"),
 "A000000149211": ("AHC","[수분탄력] AHC 온리포맨 올인원 에센스 더블 기획 (120ml+120ml)","38,000원","23,600원"),
 "A000001004124": ("아이오페","[10년 연속 1위/ 퍼펙트 올인원]아이오페 포맨 퍼펙트솔루션 토탈안티에이징 올인원 기획 120g (+30g)","38,000원","27,900원"),
 "A000000137488": ("비오템","비오템옴므 아쿠아파워 올인원 50ml 트래블 기획/200ml","30,000원 ~","20,400원 ~"),
 "A000000179227": ("피지오겔","피지오겔 DMT포맨 증정 기획세트 2종 한정기획 (플루이드 or 크림)","65,000원 ~","29,900원 ~"),
 "A000000163494": ("라운드랩","[수분진정] 라운드랩 포 맨 자작나무 수분 로션 200ml","24,000원","17,100원"),
 "A000000264982": ("히이즈","[남성 전용 선크림]히이즈 프로텍트 올인원 프로 120ml","32,300원","29,740원"),
 "A000000187675": ("라운드랩","[박재훈PICK] 라운드랩 포맨 자작나무 토너/로션 2종기획 (+쉐이빙 폼 40ml)","42,000원","28,000원"),
 "A000000199156": ("라운드랩","[모공진정] 라운드랩 포 맨 소나무 토너/로션 2종 기획(+진정 클렌저 40ml 증정)","43,000원","30,300원"),
 "A000000155994": ("포맨트","포맨트 시그니처 올인원 에센스 96ml","28,900원","23,100원"),
 "A000000167411": ("헤라","헤라 옴므 올인원 스킨 하이드로 트리트먼트 150ML","48,000원 ~","38,400원 ~"),
 "A000000228228": ("아이디얼포맨","[7년 연속 1등]  아이디얼포맨 퍼펙트 올인원 150ml 단품/기획","28,000원 ~","16,800원 ~"),
 "A000000210719": ("아이디얼포맨","아이디얼포맨 퍼펙트 보습 올인원 단품/1+1기획","28,000원 ~","9,900원 ~"),
 "A000000238816": ("오브제","[1등 기름종이선스틱] 오브제 포어 제로 오일 컨트롤 선스틱 18g 단품/기획","25,000원 ~","18,900원 ~"),
}
EXCLUDE = re.compile(r"톤업|쌩얼|커버|쿠션|틴티드|바디|토너/로션|미스트|패드|마스크|리무버|H2O|갈색병|워시필|필링")
EXTRA = re.compile(r"\d종 ?세트|스킨케어 \d종|세트|&|괄사|\+ ?클렌징|\+ ?폼|아이 ?크림|키트|에센스 ?\d+ml ?\+")

def core(name):
    s = re.sub(r"\[[^\]]*\]", " ", name)
    s = re.sub(r"\(\+[^)]*\)", " ", s)
    s = re.sub(r"\([^)]*(증정|기획|택|단품|콜라보|키링|파우치|코스터)[^)]*\)", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def classify(n):
    if "올인원" in n: return "allinone"
    if re.search(r"클렌|폼$|폼 |워시|클렌징|오일 젤|밀크밤|떡솝|파우더 클렌저", n): return "cleanser"
    if re.search(r"선크림|선 크림|선세럼|선스틱|선 플러스|선 젤|선스크린|썬스크린|썬|UV|선앰플|수딩 업 선|업 선|선 플루이드|선 밀크", n): return "sun"
    if re.search(r"토너|스킨 ?부스터|에센스 토너", n): return "toner"
    if re.search(r"크림|로션|에멀전|밤 |밤$|수딩젤|플루이드", n): return "moisturizer"
    if re.search(r"세럼|앰플|에센스|부스터|샷", n): return "serum"
    return None

def won(s):
    m = re.search(r"([\d,]+)원", s or "")
    return int(m.group(1).replace(",", "")) if m else None

def strip_brand(brand, n):
    n = n.replace(brand, "", 1).strip() if n.startswith(brand) else n
    n = re.sub(r"\s\d+(\.\d+)?\s?(ml|mL|ML|g|G)\b.*$", "", n).strip()
    n = re.sub(r"\s\d+\+\d+.*$", "", n).strip()
    n = re.sub(r"\s?(단품|기획|리필|1\+1|2입).*$", "", n).strip()
    n = re.sub(r"\s더블(\s?기획.*)?$", "", n).strip()
    return n

out, seen = [], set()
def clean_ing(t):
    t = t or ""
    if "본품" in t:
        t = re.split(r"증정\s*[:：]?", re.split(r"본품\s*[:：]?", t, maxsplit=1)[1])[0]
    secs = re.findall(r"\[[^\]]*\]([^\[]+)", t)
    if len(secs) >= 2: t = secs[0]
    t = re.sub(r"\(\s*[\d.,]+\s*(ppm|%|mg)\s*\)", "", t, flags=re.I)
    t = re.sub(r"\[[^\]]*\]", " ", t).strip()
    if t.count(",") < 5:
        t = ", ".join(x for x in re.split(r"\s+", t) if x)
    t = re.sub(r"\(\s*[\d.,\s]+\s*(ppm|ppb|%|mg)\s*\)", "", t, flags=re.I)
    return re.sub(r"(?<!\d)\s*,\s*", ", ", t).strip(" ,")

# 2차 수집분(raw2.json, 브라우저 수집): q는 dict 목록, d는 {v,s,i,f,m,u}
IMG2 = {}
NEW = set()
if len(sys.argv) > 2:
    r2 = json.load(open(sys.argv[2]))
    for x in r2["q"]:
        src["q"].append([x["g"], x.get("cat", ""), x["src"], x["rank"], x["brand"], x["name"], x["org"], x["cur"], 1 if x["src"] == "men" else 0])
        NEW.add(x["g"])
        if x.get("img"): IMG2[x["g"]] = x["img"][:2] + ("ko.jpg" if x["img"][2] == "j" else "ko.png")
    for k, v in r2["d"].items():
        src["d"].setdefault(k, v)

for row in src["q"]:
    g, cat, srcname, rank, brand, name, org, cur, men = row
    if srcname == "men": men = 1
    if g in MEN and not name:
        brand, name, org, cur = MEN[g]
    d = src["d"].get(g)
    if not d or not name or not name.strip(): continue
    ing = clean_ing(d.get("i", ""))
    if len(ing) < 20 or "상세페이지" in ing or "참조" in ing[:30]: continue
    c = core(name)
    if EXCLUDE.search(c): continue
    if g in NEW and (EXTRA.search(c) or EXTRA.search(name)): continue
    cat2 = classify(c)
    if not cat2: continue
    vol_txt = d.get("v", "")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(ml|mL|ML|g|G)", vol_txt) or re.search(r"(\d+(?:\.\d+)?)\s*(ml|mL|ML|g|G)", c)
    vol = float(m.group(1)) if m else None
    units = 2 if re.search(r"1\+1|2입|더블|[xX] ?2|듀오|\+\s?\d+m[lL] 리필|리필 기획|\d+\+\d+\s?(m|g|G)", name) else 1
    price = won(org) or won(cur)
    if not price: continue
    key = (brand, strip_brand(brand, c))
    if key in seen: continue
    seen.add(key)
    out.append({
        "id": g.lower()[-8:], "goodsNo": g, "brand": brand, "name": strip_brand(brand, c), "fullName": name,
        "category": cat2, "price": price, "salePrice": won(cur), "priceFrom": "~" in (org or cur or ""),
        "units": units, "volume": vol or {"cleanser":150,"toner":200,"serum":30,"moisturizer":50,"allinone":150,"sun":50}[cat2],
        "volumeText": vol_txt[:60], "volumeEstimated": vol is None,
        "spec": d.get("s", "")[:80], "functional": d.get("f", "")[:80],
        "maker": d.get("m", "")[:80],
        "ingredients": ing, "forMen": bool(men) or bool(re.search(r"포 ?맨|옴므|맨즈|남성", name)),
        "rank": rank or 0, "rankSource": srcname,
    })
# 대표 이미지(올리브영 썸네일). scripts/images.txt: "goodsNo 끝 8자리 + 버전 2자리 + j|p"
IMG = {}
for e in open("scripts/images.txt").read().strip().split(","):
    if len(e) == 11:
        IMG["A0000" + e[:8]] = e[8:10] + ("ko.jpg" if e[10] == "j" else "ko.png")
for p_ in out:
    v = IMG.get(p_["goodsNo"]) or IMG2.get(p_["goodsNo"])
    p_["image"] = f"https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/400/10/0000/{p_['goodsNo'][5:9]}/{p_['goodsNo']}{v}?l=ko" if v else ""

# 수동 보정(이름 규칙으로 잘못 분류된 것)
FIX_CAT = {"이지워시 마일드 선크림": "sun", "프로텍트 올인원 프로": "sun", "더 6 펩타이드 스킨 부스터 세럼": "serum"}
for p_ in out:
    p_["name"] = re.sub(r"\s*\([^)]*\)\s*$", "", p_["name"]).replace(" 증정", "").replace(" 대용량", "").strip()
    p_["name"] = re.sub(r"\s\d+(ml|g)$", "", p_["name"])
    p_["name"] = re.sub(r"\s+\d종(\s?택\s?1)?$", "", p_["name"])
    p_["name"] = re.sub(r"\s*SPF\s?\d+\+?\s*/?\s*(PA\++)?", "", p_["name"]).strip()
    if p_["name"] in FIX_CAT: p_["category"] = FIX_CAT[p_["name"]]
json.dump(out, open("src/data/products.json", "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), Counter(p["category"] for p in out))
