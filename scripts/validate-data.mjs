#!/usr/bin/env node
/* validate-data.mjs — garde-fou d'intégrité de data/donnees.json.
   Sort en code 1 (avec la liste des erreurs) si une incohérence est trouvée.
   Node natif uniquement, aucune dépendance à installer. */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCsv } from './build-csv.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'donnees.json'), 'utf8'));

const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

const STATUTS = new Set(['confirme', 'estime', 'a_confirmer']);
const EUR = (n) => Number(n).toLocaleString('fr-FR');
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

/* ---------- sources : identifiants définis ---------- */
const defined = new Set();
for (const s of data.sources || []) {
  check(s.id, `source sans id : ${JSON.stringify(s).slice(0, 60)}`);
  check(!defined.has(s.id), `id de source dupliqué : ${s.id}`);
  check(typeof s.url === 'string' && /^https?:\/\//.test(s.url), `source ${s.id} : url absente ou invalide`);
  defined.add(s.id);
}

/* Toute référence de source, où qu'elle soit dans le document (clés
   `source`, `sources`, ou terminant par `_source`), doit exister. */
function walkSources(node, path) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkSources(v, `${path}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const isRef = k === 'source' || k === 'sources' || k.endsWith('_source');
      if (isRef) {
        for (const id of Array.isArray(v) ? v : [v]) {
          check(defined.has(id), `source référencée inexistante : "${id}" (${path}.${k})`);
        }
      } else {
        walkSources(v, `${path}.${k}`);
      }
    }
  }
}
// On exclut la liste `sources` elle-même (ce sont les définitions, pas des références).
const { sources, ...rest } = data;
walkSources(rest, '$');

/* ---------- collecte annuelle ---------- */
let prevAnnee = -Infinity;
for (const x of data.collecte_annuelle || []) {
  check(x.total === x.csa + x.casa,
    `collecte ${x.annee} : total (${EUR(x.total)}) ≠ csa+casa (${EUR(x.csa + x.casa)})`);
  check(STATUTS.has(x.statut), `collecte ${x.annee} : statut invalide "${x.statut}"`);
  check(x.annee > prevAnnee, `collecte : années non strictement croissantes autour de ${x.annee}`);
  prevAnnee = x.annee;
}

/* ---------- clé de répartition légale ---------- */
const rep = data.repartition_legale;
if (rep) {
  let sommeGroupes = 0;
  for (const g of rep.groupes) {
    const sommePostes = g.postes.reduce((a, p) => a + p.part, 0);
    check(near(sommePostes, g.part),
      `répartition "${g.groupe}" : somme des postes ${sommePostes} ≠ part du groupe ${g.part}`);
    sommeGroupes += g.part;
  }
  check(near(sommeGroupes, 1), `répartition : somme des groupes ${sommeGroupes} ≠ 1`);
}

/* ---------- CSV synchronisé avec le JSON ---------- */
const csvOnDisk = readFileSync(join(ROOT, 'data', 'donnees.csv'), 'utf8');
check(csvOnDisk === buildCsv(data),
  'data/donnees.csv est désynchronisé du JSON — lancez `npm run build:csv`.');

/* ---------- rapport ---------- */
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) de données :`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ Données valides : ${data.collecte_annuelle.length} années, ${defined.size} sources, CSV synchronisé.`);
