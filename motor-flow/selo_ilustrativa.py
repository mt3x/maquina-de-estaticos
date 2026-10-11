"""Escreve "*Imagem ilustrativa" (regra da marca para artes com pessoas) num canto discreto.

Mesma família, corpo e ênfase do aviso legal; cor clara/escura conforme o fundo.
uso: python3 selo_ilustrativa.py <arte> <saida> (--auto | --xy x,y) [--canto direita|esquerda] [--px N] [--texto "..."]
--auto: alinha à direita logo acima do bloco do aviso legal (detectado pela densidade de bordas no rodapé).
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageStat

FONTE = os.environ.get("MAQUINA_FONTE_SELO")
TEXTO = os.environ.get("MAQUINA_TEXTO_SELO") or "*Imagem ilustrativa"


def topo_aviso(img):
    g = np.asarray(img.convert("L"), dtype=float); H, W = g.shape
    e = np.abs(np.diff(g, axis=1)).mean(axis=1)
    base = np.median(e[int(H * 0.6):]); txt = e > base * 1.8 + 3
    y = H - 1
    while y > H * 0.6 and not txt[y]:
        y -= 1
    if y <= H * 0.6:
        return int(H * 0.9)
    gap = 0
    while y > H * 0.6:
        if txt[y]:
            gap = 0
        else:
            gap += 1
            if gap > max(6, H * 0.012):
                break
        y -= 1
    return int(y + gap)


def medir_aviso(img):
    """Corpo (px) e cor do aviso legal já impresso na arte, para o selo sair igual a ele."""
    g = np.asarray(img.convert("L"), dtype=float); H, W = g.shape
    y0 = topo_aviso(img); blk = g[y0:, int(W * .06):int(W * .94)]
    bg = np.median(blk); tinta = np.abs(blk - bg) > 40
    linhas, ini = [], None
    for i, r in enumerate(tinta.mean(axis=1) > 0.003):
        if r and ini is None: ini = i
        if not r and ini is not None: linhas.append(i - ini); ini = None
    alturas = [h for h in linhas if h >= 4]
    if len(alturas) < 2:
        return None, None
    h = float(np.median(alturas))
    amostra = "Imagens meramente ilustrativas, sujeitas à aprovação."  # neutra: acento, cedilha e letras com perna, como um aviso legal
    f = fonte(100); b = ImageDraw.Draw(Image.new("L", (10, 10))).textbbox((0, 0), amostra, font=f)
    px = max(9, round(h * 100 / (b[3] - b[1])))
    rgb = np.asarray(img.convert("RGB"), dtype=float)[y0:, int(W * .06):int(W * .94)][tinta]
    if len(rgb):
        lum = rgb.mean(axis=1); escuros = rgb[lum <= np.percentile(lum, 25)] if bg > 128 else rgb[lum >= np.percentile(lum, 75)]
        cor = tuple(int(v) for v in np.median(escuros, axis=0))
    else:
        cor = None
    return px, cor


def fonte(px, peso="Regular"):
    try:
        f = ImageFont.truetype(FONTE, px)
        try:
            f.set_variation_by_name(peso.encode())
        except Exception:
            pass
        return f
    except OSError:
        return ImageFont.load_default(px)


def main():
    a = argparse.ArgumentParser()
    a.add_argument("arte"); a.add_argument("saida")
    a.add_argument("--auto", action="store_true"); a.add_argument("--xy")
    a.add_argument("--canto", default="direita"); a.add_argument("--px", type=int); a.add_argument("--texto", default=TEXTO)
    a.add_argument("--igual-aviso", action="store_true", help="mesmo corpo e cor do aviso legal medido na arte")
    a.add_argument("--cor", help="r,g,b (sobrepõe a cor automática)"); a.add_argument("--sombra", action="store_true")
    a.add_argument("--base", action="store_true", help="em --xy, y é a borda de baixo do texto")
    a.add_argument("--peso", default="Regular", help="Regular|Medium|SemiBold…"); a.add_argument("--ajuste-px", type=int, default=0)
    o = a.parse_args()
    if not FONTE: sys.exit("defina MAQUINA_FONTE_SELO com a fonte da marca")
    arte = Image.open(o.arte).convert("RGBA"); W, H = arte.size
    px_av, cor_av = medir_aviso(arte) if o.igual_aviso else (None, None)
    px = (o.px or px_av or max(10, round(W * 0.013))) + o.ajuste_px; f = fonte(px, o.peso)
    texto = o.texto.replace("\\n", "\n"); linhas = texto.split("\n"); esp = round(px * 0.3)
    tw = max(ImageDraw.Draw(arte).textlength(l, font=f) for l in linhas); th = len(linhas) * px + (len(linhas) - 1) * esp
    if o.auto:
        x, y = W - round(W * 0.037), topo_aviso(arte) - th - round(W * 0.018)
    else:
        x, y = (int(v) for v in o.xy.split(","))
        if o.base: y -= th
    if o.canto == "direita":
        x -= int(tw)
    caixa = (max(0, x), max(0, y), min(W, x + int(tw)), min(H, y + th + 4))
    lum = ImageStat.Stat(arte.convert("L").crop(caixa)).mean[0]
    if o.cor:
        cor = tuple(int(v) for v in o.cor.split(",")) + (255,)
    elif o.igual_aviso:
        escura = cor_av if cor_av and sum(cor_av) < 450 else (60, 60, 60)
        cor = escura + (255,) if lum > 150 else (249, 249, 249, 255)
    else:
        cor = (40, 40, 40, 190) if lum > 150 else (249, 249, 249, 200)
    camada = Image.new("RGBA", arte.size, (0, 0, 0, 0))
    if o.sombra and sum(cor[:3]) > 450:  # sombra só para texto claro sobre foto
        sombra = Image.new("RGBA", arte.size, (0, 0, 0, 0))
        for r, a in ((3, 110), (1.2, 170)):  # halo largo e suave + contorno curto: legível até sobre cinza claro
            s_ = Image.new("RGBA", arte.size, (0, 0, 0, 0))
            ImageDraw.Draw(s_).multiline_text((x + int(tw), y + 1), texto, font=f, fill=(0, 0, 0, a), anchor="ra", align="right", spacing=esp)
            sombra = Image.alpha_composite(sombra, s_.filter(ImageFilter.GaussianBlur(r)))
        camada = Image.alpha_composite(camada, sombra)
    ImageDraw.Draw(camada).multiline_text((x + int(tw), y), texto, font=f, fill=cor, anchor="ra", align="right", spacing=esp)
    Image.alpha_composite(arte, camada).convert("RGB").save(o.saida)
    print("ok", o.saida, f"px={px} cor={cor[:3]} fundo={lum:.0f} xy={x},{y}")


if __name__ == "__main__":
    main()
