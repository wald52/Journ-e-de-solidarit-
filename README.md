# Où est passé l'argent de la journée de solidarité ?

Site citoyen, ouvert et non partisan, qui retrace **combien rapporte la journée de
solidarité** en France, **année après année**, et **où va l'argent**. Visualisation
des flux par un **diagramme de Sankey**, données **sourcées** et **téléchargeables**.

## Le sujet en bref

La journée de solidarité (loi du 30 juin 2004, dans la foulée de la canicule de 2003)
fait travailler les salariés 7 h non rémunérées par an. Elle se matérialise par deux
prélèvements affectés à la **CNSA** (Caisse nationale de solidarité pour l'autonomie) :

- **CSA** — 0,30 % de la masse salariale brute, payée par les employeurs (depuis 2004) ;
- **CASA** — 0,30 % sur les pensions imposables des retraités (depuis 2013, versée à la
  CNSA à partir de 2015).

En cumulé depuis 2004, la CSA seule représente **« plus de 50 Md€ »** (chiffrage CNSA) ;
CSA + CASA dépassent **60 Md€**. Pourtant, en 2026, **91 % des chambres d'EHPAD ne sont
toujours pas climatisées** et la surmortalité estivale persiste. Le site présente les
faits, leurs sources, et — dans une section distincte — les analyses et débats.

## Structure du projet

```
index.html            page unique (sections ancrées)
assets/
  style.css           mise en forme
  app.js              chargement des données + rendu (compteurs, tableau, sources…)
  charts.js           graphiques ECharts (Sankey, histogrammes)
data/
  donnees.json        SOURCE UNIQUE DE VÉRITÉ : tous les chiffres + leurs sources
  donnees.csv         export plat des collectes annuelles
```

Aucun build, aucune dépendance à installer : du HTML/CSS/JS statique. La seule
librairie de graphiques (Apache ECharts, licence Apache 2.0) est **embarquée
localement** dans `assets/vendor/echarts.min.js` — pas de dépendance à un CDN
tiers, le site fonctionne hors-ligne et de façon reproductible.

## Lancer en local

Le site charge `data/donnees.json` via `fetch`, ce qui nécessite un serveur HTTP
(ouvrir le fichier en `file://` ne fonctionne pas). Le plus simple :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Héberger (gratuit)

Compatible **GitHub Pages** : activez Pages sur la branche, le site est servi tel quel
(c'est un site statique à la racine du dépôt).

## Les données

Chaque valeur de `data/donnees.json` porte :

- une **source** (`source`) renvoyant à la liste `sources` (éditeur + URL) ;
- un **statut** de fiabilité :
  - `confirme` — chiffre publié par une source officielle ;
  - `estime` — reconstitué par recoupement ou projection officielle ;
  - `a_confirmer` — ordre de grandeur, à vérifier sur source primaire.

Les chiffres `a_confirmer` ne sont jamais présentés comme des faits établis (badge visible
dans l'interface). Mettre à jour le site = éditer `donnees.json` (puis régénérer le CSV).

### Régénérer le CSV depuis le JSON

```bash
python3 - <<'PY'
import json, csv
d = json.load(open('data/donnees.json'))
with open('data/donnees.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['annee','csa_eur','casa_eur','total_eur','statut','source_id'])
    for x in d['collecte_annuelle']:
        w.writerow([x['annee'], x['csa'], x['casa'], x['total'], x['statut'], x['source']])
PY
```

## Principes éditoriaux

- Le **cœur du site** est factuel : chiffres + sources, sans adjectifs militants.
- Les **interprétations** (lecture libérale, positions syndicales, Cour des comptes,
  comparaisons internationales) vivent dans une section **« Analyses »** clairement
  identifiée et séparée.
- Toute affirmation chiffrée renvoie à une source cliquable.

## Contribuer

Corrections de chiffres, ajout de sources primaires (notamment pour les années
`a_confirmer`), améliorations d'accessibilité : les contributions sont bienvenues.
Indiquez toujours la source de chaque chiffre modifié.

## Avertissement

Projet citoyen indépendant. Il agrège des données publiques et ne représente aucune
institution.
