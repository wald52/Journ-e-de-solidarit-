/* app.js — chargement des données et rendu du contenu hors graphiques. */
window.DATA = null;

const fmtEuro = (v) => v >= 1e9
  ? (v / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Md€'
  : v >= 1e6
    ? (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M€'
    : v.toLocaleString('fr-FR') + ' €';
const fmtPct = (v) => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' %';
const statutLabel = { confirme: 'confirmé', estime: 'estimé', a_confirmer: 'à confirmer' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sourceById(id) { return (DATA.sources || []).find((s) => s.id === id); }
function sourceLink(id) {
  const s = sourceById(id);
  if (!s) return esc(id);
  return `<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.titre)}">${esc(s.editeur)}</a>`;
}

function renderCounters() {
  const ca = DATA.collecte_annuelle;
  const cumulCsa = ca.reduce((a, x) => a + x.csa, 0);
  const cumulTotal = ca.reduce((a, x) => a + x.total, 0);
  const last = ca[ca.length - 1];
  const items = [
    ['≈ ' + fmtEuro(cumulCsa), `CSA cumulée (${ca[0].annee}–${last.annee})`],
    ['≈ ' + fmtEuro(cumulTotal), `CSA + CASA cumulées (${ca[0].annee}–${last.annee})`],
    [fmtEuro(last.total), `produit ${last.annee} (${statutLabel[last.statut]})`],
    [(DATA.reperes.taux_csa * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' %', 'de la masse salariale (taux CSA)'],
    [(last.annee - DATA.reperes.annee_creation + 1) + ' ans', "d'existence du dispositif"]
  ];
  document.getElementById('counters').innerHTML = items.map(([num, lbl]) => `<div class="counter"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`).join('');
  document.getElementById('hero-note').innerHTML = 'Chiffrage officiel CNSA : ' + esc(DATA.reperes.cumul_officiel_libelle) + '. Les cumuls additionnent le tableau, y compris 2004 (année partielle) et la prévision 2026.';
}

function renderTable() {
  document.querySelector('#table-collecte tbody').innerHTML = DATA.collecte_annuelle.map((x) => {
    const note = x.note ? ` title="${esc(x.note)}"` : '';
    return `<tr${note}><td>${x.annee}</td><td class="num">${fmtEuro(x.csa)}</td><td class="num">${x.casa ? fmtEuro(x.casa) : '—'}</td><td class="num"><strong>${fmtEuro(x.total)}</strong></td><td><span class="badge ${x.statut}">${statutLabel[x.statut]}</span></td><td>${sourceLink(x.source)}</td></tr>`;
  }).join('');
}

function bar(label, valueLabel, ratio, color) {
  return `<div class="bar-row"><span class="bar-label">${esc(label)}</span><span class="bar-val">${esc(valueLabel)}</span><span class="bar-track"><span class="bar-fill" style="width:${(ratio * 100).toFixed(1)}%;background:${color}"></span></span></div>`;
}

function renderRepartition() {
  const rep = DATA.repartition_legale;
  let html = '';
  rep.groupes.forEach((g) => {
    html += `<p style="margin:6px 0 2px;font-weight:600">${esc(g.groupe)} — ${fmtPct(g.part)}</p>`;
    g.postes.forEach((p) => { html += bar(p.beneficiaire, fmtPct(p.part), p.part / 0.40, g.couleur); });
  });
  html += `<p class="caption" style="margin-top:8px">${esc(rep.note)} (${sourceLink(rep.source)} · version actuelle : ${sourceLink(rep.source_actuelle)})</p>`;
  document.getElementById('repartition').innerHTML = html;

  const b = DATA.budget_branche;
  const max = Math.max(...b.postes.map((p) => p.montant));
  const palette = ['#1f6f8b', '#e08e0b', '#3a8fa8', '#9aaab5'];
  document.getElementById('budget').innerHTML = b.postes.map((p, i) => bar(p.nom, fmtEuro(p.montant), p.montant / max, palette[i % palette.length])).join('') + `<p class="caption" style="margin-top:8px">Budget présenté ${b.annee} : ${fmtEuro(b.total)}. ${esc(b.note)}</p>`;
}

function renderRecettes() {
  const r = DATA.recettes_cnsa_2025;
  if (!r) return;
  const subtotal = r.postes.reduce((a, p) => a + p.montant, 0);
  const isJds = (nom) => /CSA|CASA/.test(nom);
  document.getElementById('recettes').innerHTML = r.postes.map((p) => bar(p.nom, `${fmtEuro(p.montant)} · ${fmtPct(p.montant / subtotal)}`, p.montant / subtotal, isJds(p.nom) ? '#e08e0b' : '#9aaab5')).join('') + `<p class="caption" style="margin-top:8px">Sous-total des principales recettes affichées ${r.annee} : ${fmtEuro(subtotal)}. ${esc(r.note)} (${sourceLink(r.source)})</p>`;
  const csg = r.postes.find((p) => /^CSG/.test(p.nom));
  const jds = r.postes.filter((p) => isJds(p.nom)).reduce((a, p) => a + p.montant, 0);
  if (csg && document.getElementById('csg-part')) document.getElementById('csg-part').textContent = '~' + fmtPct(csg.montant / subtotal);
  if (document.getElementById('jds-part')) document.getElementById('jds-part').textContent = '~' + fmtPct(jds / subtotal);
}

function renderPromesse() {
  const pr = DATA.promesse_vs_realite;
  const stats = [
    [fmtPct(pr.chambres_non_climatisees_pct), 'des établissements interrogés sans climatisation dans les espaces privatifs (FNADEPA 2023)'],
    ['1', 'pièce rafraîchie par établissement : minimum réglementaire, pas climatisation de toutes les chambres'],
    ['≈ 15 000', 'décès lors de la canicule de 2003 (déclencheur du dispositif)']
  ];
  document.getElementById('promesse-stats').innerHTML = stats.map(([big, desc]) => `<div class="stat"><div class="big">${big}</div><div class="desc">${esc(desc)}</div></div>`).join('');
}

function renderClimatisation() {
  const c = DATA.climatisation_ehpad;
  if (!c) return;
  const pct1 = (v) => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  const intro = document.getElementById('clim-intro'); if (intro) intro.textContent = c.meilleur_indicateur;
  const lim = document.getElementById('clim-limites'); if (lim) lim.textContent = c.limites;
  const box = document.getElementById('clim-reperes');
  if (box) box.innerHTML = (c.points || []).map((p) => {
    let val = '';
    if (typeof p.valeur === 'number') val = pct1(p.valeur);
    else if (p.par_statut) { const vals = Object.values(p.par_statut); val = pct1(Math.min(...vals)) + ' → ' + pct1(Math.max(...vals)); }
    return `<div class="bar-row"><div class="bar-label"><strong>${p.annee}</strong> — ${esc(p.indicateur)} <span class="src">(${sourceLink(p.source)})</span></div><div class="bar-val">${esc(val)}</div></div>`;
  }).join('');
  const h = c.hopitaux, hbox = document.getElementById('clim-hopitaux');
  if (h && hbox) hbox.innerHTML = `<h3>Et les hôpitaux&nbsp;?</h3><p>${esc(h.constat)}</p><p>${esc(h.reglementation)}</p><p>${esc(h.mesures_2026)}</p><p class="src caption">Sources&nbsp;: ${(h.sources || []).map(sourceLink).join(' · ')}</p>`;
}

function renderAnalyses() {
  const a = DATA.analyses;
  document.getElementById('reconcile-text').textContent = a.estimation_haute.explication;
  document.getElementById('analyses-list').innerHTML = a.lectures.map((l) => `<div class="analyse-block"><h3>${esc(l.angle)}</h3><ul>${l.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="src caption">Source / contexte : ${sourceLink(l.source)}</p></div>`).join('');
}

function renderSources() {
  document.getElementById('maj').textContent = new Date(DATA.meta.derniere_maj).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('sources-list').innerHTML = DATA.sources.map((s) => `<li><span class="editeur">${esc(s.editeur)}</span> — ${esc(s.titre)}. <a href="${esc(s.url)}" target="_blank" rel="noopener">lien</a></li>`).join('');
}

function clarifyStaticCopy() {
  const flux = document.querySelector('#flux .wrap > p');
  if (flux) flux.innerHTML = 'Diagramme de Sankey&nbsp;: des sources de financement vers la CNSA, puis vers une <strong>ventilation historique</strong> 60/40 de l’ancienne organisation de la CNSA. Cette ventilation est un repère historique, pas une clé légale actuelle ni un traçage euro par euro des recettes 2021–2026.';
  const ouVa = document.querySelector('#ou-va .wrap > p');
  if (ouVa) ouVa.innerHTML = 'La ventilation <strong>60 % personnes âgées / 40 % personnes handicapées</strong> correspond à l’ancienne organisation en sections de la CNSA. Depuis 2021, la branche Autonomie regroupe ses recettes dans un budget de branche. La journée de solidarité représente environ <strong id="jds-part">8 %</strong> des principales recettes affichées, contre environ <strong id="csg-part">89 %</strong> pour la CSG.';
  const title = document.querySelector('#ou-va .two-col > div:first-child h3'); if (title) title.textContent = 'Ancienne ventilation 60/40 (repère historique)';
  const mort = document.querySelector('#promesse h3'); if (mort) mort.textContent = 'Mortalité liée aux épisodes de chaleur (méthodes non homogènes selon les années)';
}

function initNav() {
  const btn = document.querySelector('.nav-toggle'), menu = document.getElementById('nav-menu');
  if (!btn) return;
  btn.addEventListener('click', () => { const open = menu.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }));
}

async function boot() {
  try {
    const res = await fetch('data/donnees.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    window.DATA = await res.json();
  } catch (e) {
    document.getElementById('counters').innerHTML = '<p style="color:#b3261e">Impossible de charger les données (' + esc(e.message) + '). Servez le site via un serveur HTTP.</p>';
    return;
  }
  clarifyStaticCopy(); renderCounters(); renderTable(); renderRepartition(); renderRecettes(); renderPromesse(); renderClimatisation(); renderAnalyses(); renderSources(); initNav();
  document.dispatchEvent(new CustomEvent('data-ready'));
}

document.addEventListener('DOMContentLoaded', boot);
