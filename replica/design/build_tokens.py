"""Generate tokens.css from tokens.json. Usage: python3 build_tokens.py tokens.json out.css [out2.css ...]"""
import json, sys
t = json.load(open(sys.argv[1]))
L = [":root {"]
for k, v in t["color"].items():
    L.append(f"  --c-{k}: {v};")
L.append(f"  --font-sans: {t['font']['sans']};")
L.append(f"  --font-mono: {t['font']['mono']};")
for k, v in t["type"].items():
    L += [f"  --fs-{k}: {v['size']}px;", f"  --lh-{k}: {v['line']}px;", f"  --fw-{k}: {v['weight']};"]
for i, v in enumerate(t["space"]):
    L.append(f"  --s-{i}: {v}px;")
for k, v in t["radius"].items():
    L.append(f"  --r-{k}: {v}px;")
for k, v in t["shadow"].items():
    L.append(f"  --sh-{k}: {v};")
for k, v in t["motion"].items():
    L.append(f"  --m-{k}: {v};")
for k, v in t["layout"].items():
    L.append(f"  --l-{k}: {v}px;")
L.append("}")
css = "/* Generated from replica/design/tokens.json by build_tokens.py. Do not edit by hand. */\n" + "\n".join(L) + "\n"
for out in sys.argv[2:]:
    open(out, "w").write(css)
print(css)
