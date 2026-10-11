"""Gera variantes do logo a partir de um PNG oficial com fundo transparente.
uso: python3 logo_variantes.py <logo-oficial.png> <pasta-saida>
Saídas: logo-cor.png (original recortado), logo-branco.png, logo-branco-pingo-verde.png (preserva pixels coloridos), logo-preto.png
"""
import sys, os
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
im = np.array(Image.open(src).convert("RGBA"))
ys, xs = np.where(im[..., 3] > 10)
im = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
rgb = im[..., :3].astype(int)
cor = (rgb.max(axis=2) - rgb.min(axis=2)) > 40   # pixels saturados (ex.: pingo verde)

def salvar(nome, corpo, acento=None):
    o = im.copy(); o[..., :3] = corpo
    if acento is not None:
        o[cor, :3] = im[cor, :3] if acento == "original" else acento
    Image.fromarray(o).save(os.path.join(out, nome))

Image.fromarray(im).save(os.path.join(out, "logo-cor.png"))
salvar("logo-branco.png", (255, 255, 255))
salvar("logo-branco-pingo-verde.png", (255, 255, 255), "original")
salvar("logo-preto.png", (0, 0, 0))
print("ok", out)
