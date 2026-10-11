// Põe o número laranja no canto de cada elemento com data-n (posição calculada, sem chute).
// data-lado="d" coloca o número à direita do elemento.
addEventListener("load", () => {
  const q = document.querySelector(".quadro"); const b = q.getBoundingClientRect();
  for (const el of document.querySelectorAll("[data-n]")) {
    const r = el.getBoundingClientRect(); const n = document.createElement("span"); n.className = "num"; n.textContent = el.dataset.n;
    const x = el.dataset.lado === "d" ? r.right - b.left + 10 : r.left - b.left - 44; n.style.left = `${x}px`; n.style.top = `${r.top - b.top + r.height / 2 - 17}px`;
    q.appendChild(n);
  }
  document.body.dataset.pronto = "1";
});
