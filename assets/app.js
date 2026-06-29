/* app.js — chargement des données et rendu du contenu (hors graphiques ECharts).
   Les données proviennent toutes de data/donnees.json (source unique de vérité). */

window.DATA = null;

/* ---------- helpers de formatage ---------- */
const fmtEuro = (v) => {
  if (v >= 1e9) return (v / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Md€';
  if (v >= 1e6) return (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M€';
  return v.toLocaleString('fr-FR') + ' €';
};
const fmtPct = (v) => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' %';
const statutLabel = { confirme: 'confirmé', estime: 'estimé', a_confirmer: 'à confirmer' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sourceById(id) {
  return (DATA.sources || []).find((s) => s.id === id);
}
function sourceLink(id) {
  const s = sourceById(id);
  if (!s) return esc(id);
  return `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.titre)}">${esc(s.editeur)}</a>`;
}

/* ---------- 1. compteurs ---------- */
function renderCounters() {
  const ca = DATA.collecte_annuelle;
  const cumulCsa = ca.reduce((a, x) => a + x.csa, 0);
  const cumulTotal = ca.reduce((a, x) => a + x.total, 0);
  const last = ca[ca.length - 1];
  const annees = last.annee - DATA.reperes.annee_creation + 1;

  const items = [
    { num: '≈ ' + fmtEuro(cumulCsa), lbl: 'CSA (employeurs) cumulée depuis 2004' },
    { num: '≈ ' + fmtEuro(cumulTotal), lbl: 'CSA + CASA cumulées (2004–' + last.annee + ')' },
    { num: fmtEuro(last.total), lbl: 'produit ' + last.annee + ' (' + statutLabel[last.statut] + ')' },
    { num: fmtPct(DATA.reperes.taux_csa), lbl: 'de la masse salariale (taux CSA)' },
    { num: annees + ' ans', lbl: "d'existence du dispositif" }
  ];
  document.getElementById('counters').innerHTML = items
    .map((i) => `<div class="counter"><div class="num">${i.num}</div><div class="lbl">${i.lbl}</div></div>`)
    .join('');

  document.getElementById('hero-note').innerHTML =
    'Chiffrage officiel CNSA : ' + esc(DATA.reperes.cumul_officiel_libelle) +
    '. Les montants « cumulés » ci-dessus sont la somme du tableau année par année (voir Sources).';
}

/* ---------- 4. tableau collecte ---------- */
function renderTable() {
  const tbody = document.querySelector('#table-collecte tbody');
  tbody.innerHTML = DATA.collecte_annuelle
    .map((x) => {
      const note = x.note ? ` title="${esc(x.note)}"` : '';
      return `<tr${note}>
        <td>${x.annee}</td>
        <td class="num">${fmtEuro(x.csa)}</td>
        <td class="num">${x.casa ? fmtEuro(x.casa) : '—'}</td>
        <td class="num"><strong>${fmtEuro(x.total)}</strong></td>
        <td><span class="badge ${x.statut}">${statutLabel[x.statut]}</span></td>
        <td>${sourceLink(x.source)}</td>
      </tr>`;
    })
    .join('');
}

/* ---------- 5. barres répartition + budget ---------- */
function bar(label, value, valueLabel, ratio, color) {
  return `<div class="bar-row">
      <span class="bar-label">${esc(label)}</span>
      <span class="bar-val">${esc(valueLabel)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(ratio * 100).toFixed(1)}%;background:${color}"></span></span>
    </div>`;
}

function renderRepartition() {
  const rep = DATA.repartition_legale;
  let html = '';
  rep.groupes.forEach((g) => {
    html += `<p style="margin:6px 0 2px;font-weight:600">${esc(g.groupe)} — ${fmtPct(g.part)}</p>`;
    g.postes.forEach((p) => {
      html += bar(p.beneficiaire, p.part, fmtPct(p.part), p.part / 0.40, g.couleur);
    });
  });
  document.getElementById('repartition').innerHTML = html;

  const b = DATA.budget_branche;
  const max = Math.max(...b.postes.map((p) => p.montant));
  const palette = ['#1f6f8b', '#e08e0b', '#3a8fa8', '#9aaab5'];
  document.getElementById('budget').innerHTML =
    b.postes.map((p, i) => bar(p.nom, p.montant, fmtEuro(p.montant), p.montant / max, palette[i % palette.length])).join('') +
    `<p class="caption" style="margin-top:8px">Total branche Autonomie ${b.annee} : ${fmtEuro(b.total)}. ${esc(b.note)}</p>`;
}

/* ---------- 6. stats promesse ---------- */
function renderPromesse() {
  const pr = DATA.promesse_vs_realite;
  const stats = [
    { big: fmtPct(pr.chambres_non_climatisees_pct), desc: 'des EHPAD sans chambre climatisée (enquête FNADEPA 2023)' },
    { big: '1', desc: 'pièce rafraîchie par établissement : c\'est le minimum exigé par la loi (art. D.312-161 CASF), pas la climatisation des chambres' },
    { big: '≈ 15 000', desc: 'décès lors de la canicule de 2003 (déclencheur du dispositif)' }
  ];
  document.getElementById('promesse-stats').innerHTML = stats
    .map((s) => `<div class="stat"><div class="big">${s.big}</div><div class="desc">${esc(s.desc)}</div></div>`)
    .join('');
}

/* ---------- 7. analyses ---------- */
function renderAnalyses() {
  const a = DATA.analyses;
  document.getElementById('reconcile-text').innerHTML = esc(a.estimation_haute.explication);

  document.getElementById('analyses-list').innerHTML = a.lectures
    .map((l) => `<div class="analyse-block">
        <h3>${esc(l.angle)}</h3>
        <ul>${l.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <p class="src caption">Source / contexte : ${sourceLink(l.source)}</p>
      </div>`)
    .join('');
}

/* ---------- 8. sources ---------- */
function renderSources() {
  document.getElementById('maj').textContent =
    new Date(DATA.meta.derniere_maj).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('sources-list').innerHTML = DATA.sources
    .map((s) => `<li><span class="editeur">${esc(s.editeur)}</span> — ${esc(s.titre)}.
        <a href="${esc(s.url)}" target="_blank" rel="noopener">lien</a></li>`)
    .join('');
}

/* ---------- nav mobile ---------- */
function initNav() {
  const btn = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); })
  );
}

/* ---------- bootstrap ---------- */
async function boot() {
  try {
    const res = await fetch('data/donnees.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    window.DATA = await res.json();
  } catch (e) {
    document.getElementById('counters').innerHTML =
      '<p style="color:#b3261e">Impossible de charger les données (' + esc(e.message) +
      '). Servez le site via un serveur HTTP (ex. <code>python3 -m http.server</code>).</p>';
    return;
  }
  renderCounters();
  renderTable();
  renderRepartition();
  renderPromesse();
  renderAnalyses();
  renderSources();
  initNav();
  document.dispatchEvent(new CustomEvent('data-ready'));
}

document.addEventListener('DOMContentLoaded', boot);
