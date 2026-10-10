# Rebuild the translation block inside a page from i18n/en.json, i18n/<lang>.json and i18n/extra.json.
# Run from the folder that holds i18n/:  python3 i18n/embed.py [page.html]   (default: index.html)
import json,re,sys
PAGE=sys.argv[1] if len(sys.argv)>1 else 'index.html'
LANGS=['zh-Hans','zh-Hant','ja','ko','es','fr','de']
s=open(PAGE).read()
en=json.load(open('i18n/en.json'))
base=sorted(set(en['units'])|set(en['attrs'])|set(en['meta'])|set(en['dynamic']))
tr={c:json.load(open('i18n/%s.json'%c)) for c in LANGS}
flat={c:{**tr[c]['units'],**tr[c]['attrs'],**tr[c]['meta'],**tr[c]['dynamic']} for c in LANGS}
SEQ=re.compile(r'^(?:<(\d+)>[^<]*</\1>)+$')
part=lambda k:{m.group(1):m.group(2).strip() for m in re.finditer(r'<(\d+)>([^<]*)</\1>',k)}
extra=[]
for k in base:
    if SEQ.match(k):
        pk=part(k)
        for i,v in pk.items():
            if v and re.search('[A-Za-z]',v) and v not in base and v not in extra: extra.append(v)
            for c in LANGS:
                pt=part(flat[c].get(k,''))
                if v and pt.get(i): flat[c].setdefault(v,pt[i])
EX=json.load(open('i18n/extra.json'))
for k,v in EX.items():
    if k not in base and k not in extra: extra.append(k)
    for c in LANGS: flat[c].setdefault(k,v[c])
keys={'x':base+extra,'t':list(en['templates'].keys())}
blk='<!-- v3.9 · translations: one list of English keys, then per language the translations in the same order (en.json and i18n/<lang>.json are the sources) -->\n'
blk+='<script type="application/json" id="i18n-keys">%s</script>\n'%json.dumps(keys,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
for c in LANGS:
    arr={'x':[flat[c].get(k,'') for k in keys['x']],'t':[tr[c]['templates'][k] for k in keys['t']]}
    blk+='<script type="application/json" id="i18n-%s">%s</script>\n'%(c,json.dumps(arr,ensure_ascii=False,separators=(',',':')).replace('</','<\\/'))
a=s.index('<!-- v3.9 · translations'); b=s.index('<script>\n// MAT i18n · what counts',a)
s=s[:a]+blk+s[b:]
open(PAGE,'w').write(s); print('keys',len(keys['x']),'derived',len(extra))
