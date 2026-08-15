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
const esc = (s) => String(s).replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));

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
    { num: '≈ ' + fmtEuro(cumulCsa), lbl: 'CSA (employeurs) cumulée (' + ca[0].annee + '–' + last.annee + ')' },
    { num: '≈ ' + fmtEuro(cumulTotal), lbl: 'CSA + CASA cumulées (' + ca[0].annee + '–' + last.annee + ')' },
    { num: fmtEuro(last.total), lbl: 'produit ' + last.annee + ' (' + statutLabel[last.statut] + ')' },
    { num: (DATA.reperes.taux_csa * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' %', lbl: 'de la masse salariale (taux CSA)' },
    { num: annees + ' ans', lbl: "d'existence du dispositif" }
  ];
  document.getElementById('counters').innerHTML = items
    .map((i) => `<div class="counter"><div class="num">${i.num}</div><div class="lbl">${i.lbl}</div></div>`)
    .join('');

  document.getElementById('hero-note').innerHTML =
    'Chiffrage officiel CNSA : ' + esc(DATA.reperes.cumul_officiel_libelle) +
    '. Les montants cumulés ci-dessus additionnent le tableau, y compris 2004 (année partielle) et la prévision 2026.';
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
  html += `<p class="caption" style="margin-top:8px">${esc(rep.note)} (${sourceLink(rep.source)} · version actuelle : ${sourceLink(rep.source_actuelle)})</p>`;
  document.getElementById('repartition').innerHTML = html;

  const b = DATA.budget_branche;
  const max = Math.max(...b.postes.map((p) => p.montant));
  const palette = ['#1f6f8b', '#e08e0b', '#3a8fa8', '#9aaab5'];
  document.getElementById('budget').innerHTML =
    b.postes.map((p, i) => bar(p.nom, p.montant, fmtEuro(p.montant), p.montant / max, palette[i % palette.length])).join('') +
    `<p class="caption" style="margin-top:8px">Budget présenté ${b.annee} : ${fmtEuro(b.total)}. ${esc(b.note)}</p>`;
}

/* ---------- 5 bis. d'où viennent les recettes de la branche ---------- */
function renderRecettes() {
  const r = DATA.recettes_cnsa_2025;
  if (!r) return;
  const subtotal = r.postes.reduce((a, p) => a + p.montant, 0);
  const isJds = (nom) => /CSA|CASA/.test(nom);
  const html = r.postes
    .map((p) => {
      const part = p.montant / subtotal;
      const color = isJds(p.nom) ? '#e08e0b' : '#9aaab5';
      const label = fmtEuro(p.montant) + ' · ' + fmtPct(part);
      return bar(p.nom, p.montant, label, p.montant / subtotal, color);
    })
    .join('');
  document.getElementById('recettes').innerHTML =
    html + `<p class="caption" style="margin-top:8px">Sous-total des principales recettes affichées ${r.annee} : ${fmtEuro(subtotal)}. ${esc(r.note)} (${sourceLink(r.source)})</p>`;

  const csg = r.postes.find((p) => /^CSG/.test(p.nom));
  const jds = r.postes.filter((p) => isJds(p.nom)).reduce((a, p) => a + p.montant, 0);
  const setPct = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = '~' + fmtPct(v); };
  if (csg) setPct('csg-part', csg.montant / subtotal);
  setPct('jds-part', jds / subtotal);
}

/* ---------- 6. stats promesse ---------- */
function renderPromesse() {
  const pr = DATA.promesse_vs_realite;
  const stats = [
    { big: fmtPct(pr.chambres_non_climatisees_pct), desc: 'des établissements interrogés sans climatisation dans les espaces privatifs (enquête FNADEPA 2023)' },
    { big: '1', desc: 'pièce rafraîchie par établissement : minimum réglementaire, pas climatisation de toutes les chambres' },
    { big: '≈ 15 000', desc: 'décès lors de la canicule de 2003 (déclencheur du dispositif)' }
  ];
  document.getElementById('promesse-stats').innerHTML = stats
    .map((s) => `<div class="stat"><div class="big">${s.big}</div><div class="desc">${esc(s.desc)}</div></div>`)
    .join('');
}

/* ---------- 6 bis. climatisation EHPAD ---------- */
function renderClimatisation() {
  const c = DATA.climatisation_ehpad;
  if (!c) return;
  const pct1 = (v) => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
  const intro = document.getElementById('clim-intro');
  if (intro) intro.textContent = c.meilleur_indicateur;
  const lim = document.getElementById('clim-limites');
  if (lim) lim.textContent = c.limites;

  const reperes = (c.points || []).map((p) => {
    let val;
    if (typeof p.valeur === 'number') {
      val = pct1(p.valeur);
    } else if (p.par_statut) {
      const vals = Object.values(p.par_statut);
      val = pct1(Math.min(...vals)) + ' → ' + pct1(Math.max(...vals));
    } else {
      val = '';
    }
    return `<div class="bar-row">
        <div class="bar-label"><strong>${p.annee}</strong> — ${esc(p.indicateur)}
          <span class="src">(${sourceLink(p.source)})</span></div>
        <div class="bar-val">${esc(val)}</div>
      </div>`;
  }).join('');
  const box = document.getElementById('clim-reperes');
  if (box) box.innerHTML = reperes;

  const h = c.hopitaux;
  const hbox = document.getElementById('clim-hopitaux');
  if (h && hbox) {
    const srcs = (h.sources || []).map(sourceLink).join(' · ');
    hbox.innerHTML = `<h3>Et les hôpitaux&nbsp;?</h3>
      <p>${esc(h.constat)}</p>
      <p>${esc(h.reglementation)}</p>
      <p>${esc(h.mesures_2026)}</p>
      <p class="src caption">Sources&nbsp;: ${srcs}</p>`;
  }
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

/* ---------- corrections de libellés historiques dans le HTML statique ---------- */
function clarifyStaticCopy() {
  const flux = document.querySelector('#flux .wrap > p');
  if (flux) flux.innerHTML = 'Diagramme de Sankey&nbsp;: des sources de financement vers la CNSA, puis vers une <strong>ventilation historique</strong> 60/40 de l’ancienne organisation de la CNSA. Cette ventilation est un repère historique, pas une clé légale actuelle ni un traçage euro par euro des recettes 2021–2026.';

  const ouVa = document.querySelector('#ou-va .wrap > p');
  if (ouVa) ouVa.innerHTML = 'La ventilation <strong>60 % personnes âgées / 40 % personnes handicapées</strong> présentée ci-dessous correspond à l’ancienne organisation en sections de la CNSA. Depuis 2021, la branche Autonomie regroupe ses recettes dans un budget de branche. La journée de solidarité représente environ <strong id="jds-part">8 %</strong> des principales recettes affichées, contre environ <strong id="csg-part">89 %</strong> pour la CSG.';

  const repartTitle = document.querySelector('#ou-va .two-col > div:first-child h3');
  if (repartTitle) repartTitle.textContent = 'Ancienne ventilation 60/40 (repère historique)';

  const mortTitle = document.querySelector('#promesse h3');
  if (mortTitle) mortTitle.textContent = 'Mortalité liée aux épisodes de chaleur (méthodes non homogènes selon les années)';
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
  clarifyStaticCopy();
  renderCounters();
  renderTable();
  renderRepartition();
  renderRecettes();
  renderPromesse();
  renderClimatisation();
  renderAnalyses();
  renderSources();
  initNav();
  document.dispatchEvent(new CustomEvent('data-ready'));
}

document.addEventListener('DOMContentLoaded', boot);
