import datetime, json
T=datetime.date.today()
d=lambda n:(T-datetime.timedelta(days=n)).isoformat()
f=lambda n:(T+datetime.timedelta(days=n)).isoformat()
A={"feel":"tzone","concerns":["trouble","oil"],"sensitive":"sometimes","shave":"few","current":"few","steps":"min","sunPain":"white","budget":80000}
ACT=['00268374','00217777','00263009','00240562']; GEN=['00268374','00263009','00240562']
def chk(a,b,both=True): return {d(a+i):({"am":True,"pm":True} if both else {"am":True}) for i in range(b-a+1)}
def S(i,title,o,must,mustNot=[]):
    snap={"today":d(0),"answers":A,"routine":[{"id":x,"start":d(o.get('start',10))} for x in o.get('ids',ACT)],"checks":o.get('checks',{}),"logs":o.get('logs',[]),"reviews":o.get('reviews',{}),"declined":o.get('declined',[])}
    if 'goal' in o: snap['goal']=o['goal']
    return {"id":i,"title":title,"must":must,"mustNot":mustNot,"snap":snap}
L=lambda n,ov,tr,oi,dr,ir=None: {k:v for k,v in {"day":d(n),"overall":ov,"trouble":tr,"oil":oi,"dry":dr,"irritation":ir}.items() if v is not None}
SC=[
 S('S01','1주차, 빠짐없이 체크',{"start":3,"checks":chk(1,3)},['message'],['swap_product','pause_product','see_doctor']),
 S('S02','3일 연속 미체크',{"checks":chk(4,9,False)},['reminder'],['swap_product','see_doctor']),
 S('S03','6일 연속 미체크',{"start":14,"checks":chk(7,12,False)},['reminder'],['swap_product','see_doctor']),
 S('S04','BHA 토너 사용 중 따가움(보통)',{"checks":chk(1,8),"logs":[L(1,2,2,1,1,2)]},['pause_product'],[]),
 S('S05','BHA 토너 사용 중 따가움(심함)',{"checks":chk(1,8),"logs":[L(0,1,2,1,1,3)]},['see_doctor','pause_product'],[]),
 S('S06','센 성분 없는데 따가움(심함)',{"ids":GEN,"checks":chk(1,8),"logs":[L(0,1,1,1,2,3)]},['see_doctor'],['swap_product']),
 S('S07','면접 D-5 + 따가움(보통) + BHA',{"checks":chk(0,8),"logs":[L(0,2,2,1,1,2)],"goal":{"date":f(5),"label":"면접"}},['freeze_new','pause_product'],['swap_product']),
 S('S08','면접 D-3, 문제 없음',{"checks":chk(0,8),"goal":{"date":f(3),"label":"면접"}},['freeze_new'],['swap_product','pause_product']),
 S('S09','면접 D-20, 문제 없음',{"checks":chk(0,8),"goal":{"date":f(20),"label":"면접"}},['message'],['freeze_new','swap_product']),
 S('S10','선크림 다 써감(48일째)',{"start":48,"checks":chk(0,20)},['reorder'],['see_doctor']),
 S('S11','25일째, 후기 미작성',{"start":25,"checks":chk(0,24)},['ask_review'],['swap_product','see_doctor']),
 S('S12','토너 2개 중복',{"ids":['00268374','00217777','00218549','00263009'],"checks":chk(0,8)},['pause_product|message'],[]),
 S('S13','따가움 + 교체 제안을 이미 거절',{"checks":chk(1,8),"logs":[L(1,2,2,1,1,2)],"declined":['swap:00217777:00252696','swap:00217777:00218549']},['pause_product'],['swap:00217777:00252696','swap:00217777:00218549']),
 S('S14','따가움 기록이 6일 전(지난 일)',{"checks":chk(0,8),"logs":[L(6,2,2,1,1,2)]},['message'],['pause_product','see_doctor']),
 S('S15','34일째 트러블 악화, 자극 없음',{"start":34,"ids":GEN,"checks":chk(0,30),"logs":[L(30,3,1,1,1),L(0,2,3,2,1)]},['message'],['see_doctor']),
]
def keys(actions):
    out=[]
    for a in actions:
        t=a['type']
        if t=='swap_product': out.append(f"swap:{a['removeId']}:{a['addId']}")
        out.append(t)
    return out
def grade(sc,actions):
    ks=keys(actions)
    miss=[m for m in sc['must'] if not any(x in ks for x in m.split('|'))]
    viol=[n for n in sc['mustNot'] if n in ks]
    return miss,viol
