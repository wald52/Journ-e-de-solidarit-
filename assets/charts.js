/* charts.js — graphiques ECharts : Sankey, collecte, chaleur et climatisation. */
(function () {
  let sankeyChart, barChart, mortChart, climChart;
  const COL = { pa: '#1f6f8b', ph: '#e08e0b', cnsa: '#14506a', src: '#3a8fa8' };
  const fmtMd = (v) => (v / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Md€';
  const SHORT = {
    "Établissements et services (ESMS) — personnes âgées": "ESMS pers. âgées",
    "Allocation personnalisée d'autonomie (APA)": "APA",
    "Plan d'aide à l'investissement — personnes âgées": "Investissement PA",
    "Prestation de compensation du handicap (PCH) et MDPH": "PCH / MDPH",
    "Établissements et services (ESMS) — personnes handicapées": "ESMS pers. handicapées",
    "Plan d'aide à l'investissement — personnes handicapées": "Investissement PH"
  };
  const shortName = (n) => SHORT[n] || n;

  function buildSankey(annee) {
    const D = window.DATA;
    const row = D.collecte_annuelle.find((x) => x.annee === annee);
    if (!row) return;
    const rep = D.repartition_legale;
    const total = row.total;
    const nodes = [];
    const links = [];
    const seen = new Set();
    const addNode = (name, color) => { if (!seen.has(name)) { seen.add(name); nodes.push({ name, itemStyle: { color } }); } };
    const CNSA = 'CNSA';
    addNode(CNSA, COL.cnsa);
    if (row.csa > 0) { addNode('Salariés / employeurs (CSA)', COL.src); links.push({ source: 'Salariés / employeurs (CSA)', target: CNSA, value: row.csa }); }
    if (row.casa > 0) { addNode('Retraités imposables (CASA)', COL.src); links.push({ source: 'Retraités imposables (CASA)', target: CNSA, value: row.casa }); }
    rep.groupes.forEach((g) => {
      g.postes.forEach((p) => {
        const val = total * p.part;
        const name = shortName(p.beneficiaire);
        addNode(name, g.couleur);
        links.push({ source: CNSA, target: name, value: val, full: p.beneficiaire });
      });
    });
    sankeyChart.setOption({
      tooltip: { trigger: 'item', formatter: (pp) => pp.dataType === 'edge'
        ? pp.data.source + ' → ' + (pp.data.full || pp.data.target) + '<br/><b>' + fmtMd(pp.data.value) + '</b>'
        : '<b>' + pp.name + '</b>' },
      series: [{ type: 'sankey', left: 8, right: 168, top: 14, bottom: 14, nodeWidth: 16, nodeGap: 13,
        emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', opacity: 0.45, curveness: 0.5 },
        label: { fontSize: 12, color: '#1a2733', overflow: 'none' }, data: nodes, links }]
    }, true);
    document.getElementById('sankey-caption').innerHTML =
      'Année ' + annee + ' · produit total ' + fmtMd(total) +
      ' (CSA ' + fmtMd(row.csa) + (row.casa ? ' + CASA ' + fmtMd(row.casa) : '') + '). ' +
      'Statut : ' + ({ confirme: 'confirmé', estime: 'estimé', a_confirmer: 'à confirmer' }[row.statut]) +
      '. La ventilation 60/40 à droite est un <strong>repère historique de l’ancienne CNSA</strong> : elle ne décrit pas une clé légale actuelle ni l’affectation euro par euro des recettes de la branche Autonomie.';
  }

  function initSankey() {
    const D = window.DATA;
    sankeyChart = echarts.init(document.getElementById('sankey'));
    const sel = document.getElementById('annee-sankey');
    const annees = D.collecte_annuelle.map((x) => x.annee).slice().reverse();
    sel.innerHTML = annees.map((a) => `<option value="${a}">${a}</option>`).join('');
    const defaut = D.collecte_annuelle.find((x) => x.annee === 2025) ? 2025 : annees[0];
    sel.value = String(defaut);
    sel.addEventListener('change', () => buildSankey(parseInt(sel.value, 10)));
    buildSankey(defaut);
  }

  function initBar() {
    const D = window.DATA;
    barChart = echarts.init(document.getElementById('bar-collecte'));
    const ca = D.collecte_annuelle;
    const colorByStatut = { confirme: '#1f6f8b', estime: '#e08e0b', a_confirmer: '#c0c8cf' };
    const csa = ca.map((x) => ({ value: +(x.csa / 1e9).toFixed(3), itemStyle: { color: colorByStatut[x.statut] } }));
    const casa = ca.map((x) => ({ value: +(x.casa / 1e9).toFixed(3), itemStyle: { color: '#9c6b1f', opacity: 0.85 } }));
    barChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => {
        const r = ca[ps[0].dataIndex];
        let s = '<b>' + r.annee + '</b> · ' + ({ confirme: 'confirmé', estime: 'estimé', a_confirmer: 'à confirmer' }[r.statut]) + '<br/>';
        s += 'CSA : ' + fmtMd(r.csa) + '<br/>';
        if (r.casa) s += 'CASA : ' + fmtMd(r.casa) + '<br/>';
        s += '<b>Total : ' + fmtMd(r.total) + '</b>';
        if (r.note) s += '<br/><span style="font-size:11px;opacity:.8">' + r.note + '</span>';
        return s;
      } },
      legend: { data: ['CSA (employeurs)', 'CASA (retraités)'], top: 0 },
      grid: { left: 50, right: 16, top: 40, bottom: 40 },
      xAxis: { type: 'category', data: ca.map((x) => x.annee), axisLabel: { rotate: 45, fontSize: 11 } },
      yAxis: { type: 'value', name: 'Md€', axisLabel: { formatter: '{value}' } },
      series: [
        { name: 'CSA (employeurs)', type: 'bar', stack: 't', data: csa, barWidth: '62%' },
        { name: 'CASA (retraités)', type: 'bar', stack: 't', data: casa }
      ]
    });
  }

  function initMort() {
    const D = window.DATA;
    const el = document.getElementById('bar-surmortalite');
    if (!el || !D.promesse_vs_realite.surmortalite_estivale) return;
    mortChart = echarts.init(el);
    const sm = D.promesse_vs_realite.surmortalite_estivale.slice().sort((a, b) => a.annee - b.annee);
    mortChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => '<b>' + ps[0].name + '</b><br/>' + ps[0].value.toLocaleString('fr-FR') + ' décès' },
      grid: { left: 60, right: 16, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: sm.map((x) => x.annee) },
      yAxis: { type: 'value', name: 'décès' },
      series: [{ type: 'bar', data: sm.map((x) => x.deces), barWidth: '50%', itemStyle: { color: '#b3261e' } }]
    });
    srTable(el, 'Mortalité liée aux épisodes de chaleur (méthodes non homogènes selon les années)', ['Année', 'Décès'], sm.map((x) => [x.annee, x.deces.toLocaleString('fr-FR')]));
  }

  function initClim() {
    const D = window.DATA;
    const el = document.getElementById('bar-climatisation');
    if (!el || !D.climatisation_ehpad) return;
    const pts = D.climatisation_ehpad.points.filter((p) => p.annee === 2019 && p.par_statut);
    const chambres = pts.find((p) => /privatif|chambre/i.test(p.indicateur));
    const collectifs = pts.find((p) => /collectif/i.test(p.indicateur));
    if (!chambres || !collectifs) return;
    const statuts = [['public', 'Public'], ['prive_non_lucratif', 'Privé non lucratif'], ['prive_lucratif', 'Privé lucratif']];
    const pc = (o) => statuts.map((s) => +(o.par_statut[s[0]] * 100).toFixed(1));
    climChart = echarts.init(el);
    climChart.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (ps) => '<b>' + ps[0].name + '</b><br/>' + ps.map((p) => p.marker + p.seriesName + ' : ' + p.value.toLocaleString('fr-FR') + ' %').join('<br/>') },
      legend: { data: ['Chambres climatisées', 'Espaces collectifs climatisés'], top: 0 },
      grid: { left: 40, right: 16, top: 40, bottom: 30 },
      xAxis: { type: 'category', data: statuts.map((s) => s[1]) },
      yAxis: { type: 'value', name: '%', max: 100, axisLabel: { formatter: '{value}' } },
      series: [
        { name: 'Chambres climatisées', type: 'bar', data: pc(chambres), barWidth: '32%', itemStyle: { color: '#b3261e' } },
        { name: 'Espaces collectifs climatisés', type: 'bar', data: pc(collectifs), barWidth: '32%', itemStyle: { color: '#1f6f8b' } }
      ]
    });
    const ch = pc(chambres), co = pc(collectifs);
    srTable(el, 'Part des EHPAD climatisés en 2019, par statut', ['Statut', 'Chambres climatisées', 'Espaces collectifs climatisés'], statuts.map((s, i) => [s[1], ch[i] + ' %', co[i] + ' %']));
  }

  function srTable(afterEl, caption, headers, rows) {
    if (afterEl.nextElementSibling && afterEl.nextElementSibling.classList.contains('sr-only')) return;
    const div = document.createElement('div');
    div.className = 'sr-only';
    const thead = '<tr>' + headers.map((h) => `<th scope="col">${h}</th>`).join('') + '</tr>';
    const tbody = rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('');
    div.innerHTML = `<table><caption>${caption}</caption><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    afterEl.insertAdjacentElement('afterend', div);
  }

  function onResize() { [sankeyChart, barChart, mortChart, climChart].forEach((c) => c && c.resize()); }
  const started = new Set();
  function start(id, init) { if (started.has(id)) return; started.add(id); init(); }
  function initWhenVisible(id, init) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!('IntersectionObserver' in window)) { start(id, init); return; }
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); start(id, init); }
    }, { rootMargin: '200px' });
    io.observe(el);
  }
  function initAll() {
    start('sankey', initSankey);
    start('bar-collecte', initBar);
    start('bar-surmortalite', initMort);
    start('bar-climatisation', initClim);
  }

  document.addEventListener('data-ready', function () {
    if (typeof echarts === 'undefined') {
      document.getElementById('sankey').innerHTML = '<p style="padding:20px;color:#b3261e">La librairie de graphiques (ECharts) n\'a pas pu être chargée.</p>';
      return;
    }
    initWhenVisible('sankey', initSankey);
    initWhenVisible('bar-collecte', initBar);
    initWhenVisible('bar-surmortalite', initMort);
    initWhenVisible('bar-climatisation', initClim);
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeprint', function () { initAll(); onResize(); });
  });
})();
