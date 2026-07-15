#!/usr/bin/env node
/* build-csv.mjs — régénère data/donnees.csv à partir de data/donnees.json.
   Source unique de vérité : donnees.json. Aucun module externe (Node natif). */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'data', 'donnees.json');
const CSV_PATH = join(ROOT, 'data', 'donnees.csv');

/** Construit le contenu CSV (chaîne) à partir de l'objet de données. */
export function buildCsv(data) {
  const header = ['annee', 'csa_eur', 'casa_eur', 'total_eur', 'statut', 'source_id'];
  const lines = [header.join(',')];
  for (const x of data.collecte_annuelle) {
    lines.push([x.annee, x.csa, x.casa, x.total, x.statut, x.source].join(','));
  }
  // Newline final : cohérent avec un fichier texte POSIX.
  return lines.join('\n') + '\n';
}

// Exécution directe (pas d'écriture si importé comme module).
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  writeFileSync(CSV_PATH, buildCsv(data));
  console.log(`CSV régénéré : ${CSV_PATH} (${data.collecte_annuelle.length} lignes).`);
}
