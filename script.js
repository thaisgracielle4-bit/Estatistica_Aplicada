const $ = id => document.getElementById(id);
const fmt = (v, d = 2) => Number(v).toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});

function lerDados(txt) {
  return txt.split(/[\s;]+/).filter(Boolean).map(t => parseFloat(t.replace(',', '.'))).filter(n => !isNaN(n));
}

function calcular() {
  $('erro').textContent = '';
  const dados = lerDados($('dados').value).sort((a, b) => a - b);
  if (dados.length < 5) { $('erro').textContent = 'Informe pelo menos 5 valores numéricos.'; $('resultado').hidden = true; return; }
  const n = dados.length, min = dados[0], max = dados[n - 1];
  if (min === max) { $('erro').textContent = 'Todos os valores são iguais.'; return; }

  // Regra de Sturges
  const kExato = 1 + 3.322 * Math.log10(n), k = Math.round(kExato);
  const At = max - min, h = Math.ceil((At / k) * 100) / 100;

  // Classes [li, ls) — a última é fechada
  const cl = []; let ac = 0;
  for (let i = 0; i < k; i++) {
    const li = min + i * h, ls = li + h;
    const fi = dados.filter(v => v >= li && (i === k - 1 ? v <= ls + 1e-9 : v < ls)).length;
    ac += fi;
    cl.push({li, ls, xi: (li + ls) / 2, fi, fr: fi / n * 100, Fi: ac, Fac: ac / n * 100});
  }

  // Medidas (dados agrupados)
  const soma = cl.reduce((s, c) => s + c.fi * c.xi, 0), media = soma / n;
  const ss = cl.reduce((s, c) => s + c.fi * (c.xi - media) ** 2, 0);
  const gl = $('tipo').value === 's' ? n - 1 : n;
  const variancia = ss / gl, dp = Math.sqrt(variancia), cv = dp / media * 100;
  const nivel = cv < 15 ? 'baixa dispersão' : cv <= 30 ? 'média dispersão' : 'alta dispersão';

  $('passos').innerHTML =
    `n = <b>${n}</b> · mín = ${fmt(min)} · máx = ${fmt(max)}<br>` +
    `Sturges: k = 1 + 3,322·log₁₀(${n}) = ${fmt(kExato, 3)} → <b>k = ${k} classes</b><br>` +
    `At = ${fmt(max)} − ${fmt(min)} = <b>${fmt(At)}</b> · h = At/k = ${fmt(At / k, 3)} → <b>h = ${fmt(h)}</b>`;
  $('rol').textContent = dados.map(v => fmt(v, Number.isInteger(v) ? 0 : 2)).join(' · ');

  let t = '<thead><tr><th>Classe</th><th>fi</th><th>xi</th><th>fr (%)</th><th>Fi</th><th>Fac (%)</th><th>fi·xi</th></tr></thead><tbody>';
  cl.forEach((c, i) => t += `<tr><td>${fmt(c.li)} ${i === k - 1 ? '⊢⊣' : '⊢'} ${fmt(c.ls)}</td><td>${c.fi}</td><td>${fmt(c.xi)}</td><td>${fmt(c.fr)}</td><td>${c.Fi}</td><td>${fmt(c.Fac)}</td><td>${fmt(c.fi * c.xi)}</td></tr>`);
  t += `</tbody><tfoot><tr><td>Total</td><td>${n}</td><td></td><td>100,00</td><td></td><td></td><td>${fmt(soma)}</td></tr></tfoot>`;
  $('tabela').innerHTML = t;

  $('medidas').innerHTML = [
    ['Média (x̄)', fmt(media)], [`Variância (${$('tipo').value === 's' ? 's²' : 'σ²'})`, fmt(variancia)],
    ['Desvio-padrão', fmt(dp)], ['Coef. de Variação', fmt(cv) + '%<small>' + nivel + '</small>']
  ].map(([a, b]) => `<div class="m">${a}<b>${b}</b></div>`).join('');

  $('resultado').hidden = false;
  desenhar(cl, h);
}

function desenhar(cl, h) {
  const cv = $('grafico'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const m = {l: 55, r: 20, t: 30, b: 55}, pw = W - m.l - m.r, ph = H - m.t - m.b;
  g.clearRect(0, 0, W, H); g.font = '13px Arial'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  const x0 = cl[0].li - h, x1 = cl[cl.length - 1].ls + h;
  const fmax = Math.max(...cl.map(c => c.fi)), ymax = fmax + 1;
  const X = v => m.l + (v - x0) / (x1 - x0) * pw, Y = v => m.t + ph - v / ymax * ph;
  g.strokeStyle = '#ddd'; g.fillStyle = '#334155'; g.textAlign = 'right';
  for (let v = 0; v <= ymax; v++) { g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(W - m.r, Y(v)); g.stroke(); g.fillText(v, m.l - 8, Y(v) + 4); }
  g.fillStyle = 'rgba(79,70,229,.6)'; g.strokeStyle = '#4338ca';
  cl.forEach(c => { g.fillRect(X(c.li), Y(c.fi), X(c.ls) - X(c.li), Y(0) - Y(c.fi)); g.strokeRect(X(c.li), Y(c.fi), X(c.ls) - X(c.li), Y(0) - Y(c.fi)); });
  g.textAlign = 'center'; g.fillStyle = '#334155';
  cl.forEach(c => g.fillText(fmt(c.li, 1), X(c.li), H - m.b + 18));
  g.fillText(fmt(cl[cl.length - 1].ls, 1), X(cl[cl.length - 1].ls), H - m.b + 18);
  const pts = [[cl[0].xi - h, 0], ...cl.map(c => [c.xi, c.fi]), [cl[cl.length - 1].xi + h, 0]];
  g.strokeStyle = '#ef4444'; g.lineWidth = 2.5; g.beginPath();
  pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke();
  g.fillStyle = '#ef4444'; pts.forEach(([x, y]) => { g.beginPath(); g.arc(X(x), Y(y), 4, 0, 7); g.fill(); });
  g.fillStyle = '#334155'; g.fillText('Classes', W / 2, H - 12);
  g.save(); g.translate(14, H / 2); g.rotate(-Math.PI / 2); g.fillText('Frequência (fi)', 0, 0); g.restore();
  g.textAlign = 'left'; g.fillStyle = 'rgba(79,70,229,.8)'; g.fillRect(m.l + 10, 8, 14, 12);
  g.fillStyle = '#334155'; g.fillText('Histograma', m.l + 30, 18);
  g.fillStyle = '#ef4444'; g.fillRect(m.l + 130, 12, 20, 4); g.fillStyle = '#334155'; g.fillText('Polígono', m.l + 156, 18);
}

$('calc').onclick = calcular;
$('limpar').onclick = () => { $('dados').value = ''; $('resultado').hidden = true; $('erro').textContent = ''; };
$('exemplo').onclick = () => {
  $('dados').value = '5.5 6 7 7.5 8 8 8.5 9 9 9.5 4 4.5 5 6.5 6.5 7 7 7.5 8 8.5 9 10 3.5 5 5.5 6 6 6.5 7 7 7.5 7.5 8 8 8.5 9 6 7 8 9.5';
  calcular();
};