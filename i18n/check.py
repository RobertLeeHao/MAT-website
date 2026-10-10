# python3 check.py xx.json  → validates a translation file against en.json
import json,re,sys
en=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'en.json'))); tr=json.load(open(sys.argv[1]))
bad=[];missing=[]
tok=lambda s:sorted(re.findall(r'</?\d+/?>',s)); ph=lambda s:sorted(re.findall(r'\{\d+\}',s))
for sec in ['units','attrs','meta','dynamic','templates']:
    keys=en[sec] if isinstance(en[sec],list) else list(en[sec].keys())
    t=tr.get(sec,{})
    for k in keys:
        if k not in t or not isinstance(t[k],str) or not t[k].strip(): missing.append((sec,k[:60])); continue
        if tok(k)!=tok(t[k]): bad.append((sec,'tokens',k[:70],t[k][:70]))
        if ph(k)!=ph(t[k]): bad.append((sec,'placeholders',k[:70],t[k][:70]))
print('missing',len(missing)); [print(' ',m) for m in missing[:20]]
print('bad',len(bad)); [print(' ',b) for b in bad[:30]]
sys.exit(1 if missing or bad else 0)
