"""Reescreve o aviso legal oficial por código, no lugar do parágrafo que a IA escreveu.

A IA erra letras no aviso ("orgonismo", "plotaforma", "e/ou" faltando). Aqui o parágrafo dela é localizado
(bloco de várias linhas de letra pequena, o mais baixo da arte), apagado (inpaint) e reescrito com o texto
oficial, no mesmo retângulo, com a mesma cor e um corpo que ocupe a mesma altura.

uso: python3 aviso_oficial.py <arte> <saida> --texto-arq <identidade.json> --fonte <ttf> [--debug <png>]
saída: "ok ..." (exit 0) | "sem-aviso ..." (exit 2: nada encontrado, arte intacta)
"""
import argparse, json, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def mascara_tinta(g, limiar=38):
    fundo = cv2.medianBlur(g, 31)
    return (cv2.absdiff(g, fundo) > limiar).astype(np.uint8)


def linhas_de(m, y0, y1, x0, x1, H):
    perfil = m[y0:y1, x0:x1].mean(axis=1) > 0.004
    out, ini = [], None
    for i, r in enumerate(perfil):
        if r and ini is None: ini = i
        if not r and ini is not None: out.append((y0 + ini, y0 + i)); ini = None
    if ini is not None: out.append((y0 + ini, y1))
    return [(a, b) for a, b in out if b - a >= max(3, H * 0.003)]


def achar_bloco(img):
    """Tenta com contraste normal e, se as linhas grudarem (entrelinha apertada), com traço mais fino."""
    for limiar in (38, 80, 120):
        b = _achar_bloco(img, limiar)
        if b: return b
    return None


def _achar_bloco(img, limiar):
    """Parágrafo de letra pequena mais baixo: letras (componentes) pequenas → linhas → parágrafo com 3+ linhas."""
    g = np.asarray(img.convert("L")); H, W = g.shape
    m = mascara_tinta(g, limiar)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    hmin, hmax = max(3, H * 0.0035), H * 0.014
    ok = np.zeros(n, bool)
    for k in range(1, n):
        x, y, w, h, area = st[k]
        if hmin <= h <= hmax and w <= W * 0.3 and area >= h and y > H * 0.35: ok[k] = True
    letras = ok[lab].astype(np.uint8)
    hl = int(np.median(st[ok][:, 3])) if ok.any() else 8
    tiras = cv2.morphologyEx(letras, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, hl * 2), 1)))
    n2, _, st2, _ = cv2.connectedComponentsWithStats(tiras, 8)
    linhas = sorted([tuple(st2[k][:4]) for k in range(1, n2) if st2[k][2] > W * 0.15 and st2[k][3] <= hmax * 1.8], key=lambda r: r[1])
    grupos = []
    for (x, y, w, h) in linhas:
        for gr in grupos:
            gx0, gx1, gy1 = min(r[0] for r in gr), max(r[0] + r[2] for r in gr), max(r[1] + r[3] for r in gr)
            sobre = min(gx1, x + w) - max(gx0, x)
            if sobre > 0.5 * min(w, gx1 - gx0) and 0 <= y - gy1 <= h * 1.4: gr.append((x, y, w, h)); break
        else:
            grupos.append([(x, y, w, h)])
    grupos = [gr for gr in grupos if len(gr) >= 3]
    if not grupos:
        return None
    gr = max(grupos, key=lambda gr: max(r[1] + r[3] for r in gr))
    x0 = min(r[0] for r in gr); x1 = max(r[0] + r[2] for r in gr); y0 = min(r[1] for r in gr); y1 = max(r[1] + r[3] for r in gr)
    # cresce a caixa só com "palavras" do mesmo corpo do aviso, encadeadas (pedaços à direita, última linha curta)
    hs = np.array([r[3] for r in gr]); hl = int(np.median([st[k][3] for k in range(1, n) if ok[k] and y0 <= st[k][1] <= y1] or [hl]))
    cx = st[1:, :4]; vivos = ok[1:] & (cx[:, 3] >= hl * 0.5) & (cx[:, 3] <= hl * 1.6) & (cx[:, 2] <= hl * 14)
    caixas = cx[vivos]
    for _ in range(40):
        dx, dy = hl * 2.2, hl * 1.2
        lado = (caixas[:, 1] + caixas[:, 3] / 2 >= y0) & (caixas[:, 1] + caixas[:, 3] / 2 <= y1) & (caixas[:, 0] <= x1 + dx) & (caixas[:, 0] + caixas[:, 2] >= x0 - dx)
        abaixo = (caixas[:, 1] >= y1) & (caixas[:, 1] <= y1 + dy) & (caixas[:, 0] >= x0 - hl) & (caixas[:, 0] + caixas[:, 2] <= x1 + hl)
        acima = (caixas[:, 1] + caixas[:, 3] <= y0) & (caixas[:, 1] + caixas[:, 3] >= y0 - dy) & (caixas[:, 0] >= x0 - hl) & (caixas[:, 0] + caixas[:, 2] <= x1 + hl)
        viz = caixas[lado | abaixo | acima]
        if not len(viz): break
        n0 = (min(x0, int(viz[:, 0].min())), max(x1, int((viz[:, 0] + viz[:, 2]).max())), min(y0, int(viz[:, 1].min())), max(y1, int((viz[:, 1] + viz[:, 3]).max())))
        if n0 == (x0, x1, y0, y1): break
        x0, x1, y0, y1 = n0
    sub = letras[y0:y1, x0:x1]; perfil = sub.sum(axis=1) > 0
    ls, ini = [], None
    for i, r in enumerate(list(perfil) + [False]):
        if r and ini is None: ini = i
        if not r and ini is not None:
            if i - ini >= 3: ls.append((y0 + ini, y0 + i))
            ini = None
    bordas = []
    for a, b in ls:
        c = np.where(letras[a:b, x0:x1].sum(axis=0) > 0)[0]; bordas.append((int(x0 + c.min()), int(x0 + c.max())))
    return {"x0": int(x0), "x1": int(x1), "y0": int(y0), "y1": int(y1), "linhas": ls, "bordas": bordas, "mascara": m}


def quebrar(d, texto, f, largura):
    linhas, atual = [], []
    for p in texto.split():
        if atual and d.textlength(" ".join(atual + [p]), font=f) > largura: linhas.append(atual); atual = [p]
        else: atual.append(p)
    linhas.append(atual)
    return linhas


def main():
    a = argparse.ArgumentParser()
    a.add_argument("arte"); a.add_argument("saida")
    a.add_argument("--texto-arq", required=True); a.add_argument("--fonte", required=True); a.add_argument("--debug")
    o = a.parse_args()
    texto = json.load(open(o.texto_arq, encoding="utf-8"))["aviso_legal"]["texto"]
    img = Image.open(o.arte).convert("RGB"); W, H = img.size
    b = achar_bloco(img)
    if not b:
        print("sem-aviso", o.arte); sys.exit(2)
    x0, x1, y0, y1 = b["x0"], b["x1"], b["y0"], b["y1"]
    if y1 >= H - 2 or x1 - x0 > W * 0.97:  # caixa colada nas bordas = pegou outra coisa (fitas, fundo); não arrisca
        print("sem-aviso", o.arte, "(caixa suspeita)"); sys.exit(2)
    arr = np.asarray(img).copy()
    # cor: mediana dos pixels de tinta mais contrastantes do bloco
    reg = arr[y0:y1, x0:x1].reshape(-1, 3).astype(float); tin = b["mascara"][y0:y1, x0:x1].reshape(-1).astype(bool)
    lum = reg.mean(axis=1); fundo_claro = np.median(lum[~tin]) > 128
    t = lum[tin]; sel = tin.copy(); sel[tin] = (t <= np.percentile(t, 30)) if fundo_claro else (t >= np.percentile(t, 70))
    cor = tuple(int(v) for v in np.median(reg[sel], axis=0))
    # apaga o parágrafo da IA
    pad = 6; mk = np.zeros((H, W), np.uint8); mk[max(0, y0 - pad):min(H, y1 + pad), max(0, x0 - pad):min(W, x1 + pad)] = 1
    mk = cv2.dilate((b["mascara"] & mk).astype(np.uint8) * 255, np.ones((5, 5), np.uint8))
    limpa = cv2.inpaint(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR), mk, 4, cv2.INPAINT_TELEA)
    img = Image.fromarray(cv2.cvtColor(limpa, cv2.COLOR_BGR2RGB))
    # alinhamento do original: esquerda/justificado (bordas esquerdas alinhadas) ou centralizado
    esq = np.std([e for e, _ in b["bordas"][:-1]]) if len(b["bordas"]) > 2 else 0
    cen = np.std([(e + d) / 2 for e, d in b["bordas"]])
    centralizado = esq > 4 and cen < esq
    x0, x1 = max(x0, round(W * 0.045)), min(x1, round(W * 0.955))  # margem mínima: não encosta em bordas/molduras
    larg = x1 - x0; alt = y1 - y0
    d = ImageDraw.Draw(img); px = max(8, round(alt / max(1, len(b["linhas"])) * 0.95))
    while px > 7:  # maior corpo cujo texto oficial cabe na altura do bloco original
        f = ImageFont.truetype(o.fonte, px)
        try: f.set_variation_by_name(b"Regular")
        except Exception: pass
        ls = quebrar(d, texto, f, larg); entre = round(px * 1.28)
        if len(ls) * entre - (entre - px) <= alt * 1.04: break
        px -= 1
    y = y0 + max(0, (alt - (len(ls) * entre - (entre - px))) // 2)
    for i, pal in enumerate(ls):
        linha = " ".join(pal)
        if centralizado:
            d.text((x0 + (larg - d.textlength(linha, font=f)) / 2, y), linha, font=f, fill=cor)
        elif i == len(ls) - 1 or len(pal) == 1:
            d.text((x0, y), linha, font=f, fill=cor)
        else:
            ws = [d.textlength(p, font=f) for p in pal]; vao = (larg - sum(ws)) / (len(pal) - 1); cx = x0
            for p, w in zip(pal, ws): d.text((cx, y), p, font=f, fill=cor); cx += w + vao
        y += entre
    img.save(o.saida)
    if o.debug:
        dbg = img.copy(); ImageDraw.Draw(dbg).rectangle((x0, y0, x1, y1), outline=(255, 0, 255)); dbg.save(o.debug)
    print("ok", o.saida, f"caixa={x0},{y0},{x1},{y1} linhas={len(ls)} corpo={px}px cor={cor} {'centralizado' if centralizado else 'justificado'}")


if __name__ == "__main__":
    main()
