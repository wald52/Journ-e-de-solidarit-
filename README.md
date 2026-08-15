# Où est passé l'argent de la journée de solidarité ?

Site citoyen, ouvert et non partisan, qui retrace **combien rapporte la journée de solidarité** en France, **année après année**, et **où va l'argent**. Les données sont sourcées, téléchargeables et accompagnées d'un statut de fiabilité.

## Le sujet en bref

La journée de solidarité a été créée par la loi du 30 juin 2004, dans la foulée de la canicule de 2003. Elle s'accompagne notamment de deux prélèvements affectés au financement de l'autonomie :

- **CSA** — 0,30 % de la masse salariale brute, versée par les employeurs ;
- **CASA** — 0,30 % sur certaines pensions de retraite et d'invalidité, créée en 2013 et affectée à la CNSA depuis 2015.

La série du site commence désormais en **2004**, avec **911 M€ de CSA** pour cette année partielle de mise en place. Ce montant est publié dans une réponse officielle de l'Assemblée nationale.

Après audit des sources au **15 août 2026** :

- **2025** utilise les comptes annuels certifiés de la CNSA : **2 521 776 923 € de CSA** et **938 100 424 € de CASA**, soit **3 459 877 347 €** ;
- **2026** reste une prévision : les *Chiffres clés 2026* de la CNSA retiennent environ **2,384 Md€ de CSA** et **978 M€ de CASA**, soit **3,362 Md€** ;
- en incluant l'année partielle 2004, la série atteint environ **49,1 Md€ de CSA fin 2025** et **59,0 Md€ de CSA+CASA** ; avec la prévision 2026, environ **51,4 Md€** et **62,4 Md€**.

Ces cumuls ne doivent pas être confondus avec le chiffrage CNSA « plus de 50 Md€ sur 20 ans », dont le périmètre n'est pas strictement identique à la somme CSA+CASA présentée ici.

## Point important sur la répartition 60/40

Une version antérieure du site présentait **60 % personnes âgées / 40 % personnes handicapées** comme une clé légale actuelle applicable au produit annuel de la journée de solidarité. Cette formulation était devenue inexacte.

Cette ventilation correspond à l'**ancienne organisation en sections de la CNSA**. Depuis la création de la branche Autonomie en 2021, les recettes (CSA, CASA, CSG, etc.) entrent dans un budget de branche et l'article L.14-10-5 du CASF en vigueur ne fixe plus cette clé générale 60/40.

Le Sankey conserve donc cette ventilation uniquement comme **repère historique**, et non comme traçage euro par euro des recettes actuelles.

## Structure du projet

```text
index.html            page unique (sections ancrées)
assets/
  style.css           mise en forme
  app.js              chargement des données + rendu
  charts.js           graphiques ECharts
data/
  donnees.json        SOURCE UNIQUE DE VÉRITÉ
  donnees.csv         export plat des collectes annuelles
scripts/
  validate-data.mjs   contrôle d'intégrité
  build-csv.mjs       régénère le CSV depuis le JSON
```

Aucun build applicatif ni dépendance npm n'est nécessaire. Apache ECharts est embarqué localement dans `assets/vendor/echarts.min.js`.

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Les données

Chaque valeur importante de `data/donnees.json` renvoie à une source et, pour la collecte annuelle, à un statut :

- `confirme` — chiffre publié par une source officielle ;
- `estime` — prévision officielle ou projection ;
- `a_confirmer` — ordre de grandeur restant à vérifier.

La série 2004-2025 est au statut `confirme`. **2026 est `estime`**, car l'exercice n'est pas encore exécuté.

### Nuances de périmètre de la CSA

La ligne comptable historique appelée « CSA » n'est pas parfaitement homogène sur toute la période. Avant 2019, elle comprend notamment une fraction assise sur les revenus du capital ; en 2015-2016, une part de droits sur les tabacs intervient également. Ces éléments ne correspondent pas strictement à la seule contribution patronale de 0,30 % liée à la journée de solidarité.

Le site conserve la série comptable CNSA mais signale ces ruptures de périmètre.

## Chaleur et EHPAD

L'audit distingue désormais explicitement les sources :

- **EHPA/DREES** : enquête officielle du service statistique public, exhaustive sur son champ ;
- **FNADEPA 2023** : enquête professionnelle complémentaire, qui rapporte notamment **91,4 %** d'établissements sans climatisation dans les espaces privatifs et **60,7 %** de directeurs jugeant ces espaces thermiquement inconfortables pendant l'été 2022 ;
- la DREES a publié en 2025 les données de bâti de la nouvelle enquête **EHPA 2023**, qui devient la référence officielle la plus récente.

Les chiffres 2019 affichés par statut proviennent de l'enquête EHPA 2019 reprise dans le rapport du Sénat :

- espaces privatifs climatisés : **3,7 % public**, **5,9 % privé non lucratif**, **18 % privé lucratif** ;
- ensemble des espaces collectifs climatisés : **49,2 %**, **56,2 %**, **80 %**.

## Mortalité liée à la chaleur

Le site signale une rupture méthodologique :

- jusqu'en 2022, Santé publique France publie notamment des **excès de mortalité observés** pendant les vagues de chaleur ;
- à partir de 2023, les valeurs utilisées correspondent à une **mortalité modélisée attribuable à la chaleur**.

Le chiffre 2019 a été corrigé vers le bilan final : **1 462 décès en excès**, au lieu du bilan préliminaire de 1 435.

## Valider et régénérer les données

```bash
npm run validate
npm run build:csv
```

`npm run validate` contrôle notamment :

- `total = CSA + CASA` pour chaque année ;
- l'existence de toutes les sources référencées ;
- la validité des statuts ;
- la cohérence de la ventilation historique ;
- la synchronisation du CSV avec le JSON.

La CI GitHub exécute ces contrôles sur chaque push et pull request.

## Principes éditoriaux

- Le **cœur du site** est factuel : chiffres, périmètres et sources.
- Une prévision est explicitement distinguée d'un compte exécuté.
- Une source primaire ou institutionnelle est préférée lorsqu'elle existe.
- Les enquêtes professionnelles sont identifiées comme telles et ne sont pas assimilées à des statistiques officielles exhaustives.
- Les interprétations sont séparées dans la section « Analyses ».

## Licence

- **Code** : MIT ;
- **Données** : Licence Ouverte / Open Licence 2.0 (Etalab), sous réserve des droits attachés aux sources d'origine.

## Avertissement

Projet citoyen indépendant. Il agrège des données publiques et ne représente aucune institution.
