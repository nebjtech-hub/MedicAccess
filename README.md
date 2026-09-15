# MedicAccess Gabon

Dossier médical électronique pour cabinets et centres de diagnostic.
React + Vite + Tailwind CSS en frontend, Supabase (PostgreSQL + Auth) en backend.

---

## 1. Créer la base de données

Deux scripts, dans cet ordre.

Le script SQL n'a pas pu être exécuté à distance : ouvrez-le et collez-le vous-même.

1. Allez sur `https://supabase.com/dashboard/project/ovtepctzbqvzdgxvibit/sql/new`
2. Collez tout le contenu de **`supabase/schema.sql`**
3. Cliquez sur **Run**

Le script est relançable autant de fois que nécessaire (il supprime puis recrée les tables).
Il crée 12 tables, les séquences de numérotation, le déclencheur qui crée la fiche
médecin à l'inscription, 3 modèles de compte rendu par défaut, et **désactive le RLS**
comme demandé.

4. Collez ensuite **`grilles_endocrinologie.sql`** et cliquez sur **Run**
5. Collez **`supabase/refonte_consultation.sql`** et cliquez sur **Run**
6. Collez enfin **`supabase/maj_reunion_medecin.sql`** et cliquez sur **Run**

Ce dernier script applique les modifications décidées en réunion : nouveaux signes,
rubriques renommées, examens ajoutés, et un champ **« Autres »** en fin de chaque
rubrique. C'est une migration incrémentale — elle ne détruit aucune donnée déjà saisie.

Ce second script installe le référentiel d'interrogatoire tiré des dix documents du
médecin : 190 questions distinctes, 9 grilles, 99 examens de bilan, plus l'aide à la
saisie (abréviations, diagnostics CIM-10, quartiers, motifs fréquents). Sans lui,
l'écran de sélection des motifs reste vide.

## 2. Lancer l'application

```bash
npm install
npm run dev          # http://localhost:5173
```

Le fichier `.env` est déjà renseigné avec l'URL du projet et la clé publishable.

## 3. Créer le premier compte médecin

Sur l'écran de connexion, cliquez sur **Créer un compte**. Si Supabase exige la
confirmation par e-mail, désactivez-la pendant le développement :
*Authentication → Sign In / Providers → Confirm email* → off.

---

## Parcours de l'application

| Écran | Route | Contenu |
|---|---|---|
| Connexion | `/connexion` | Auth Supabase e-mail + mot de passe, inscription praticien |
| Tableau de bord | `/tableau-de-bord` | Cards Consultation, Patients, Comptes rendus + dernières consultations |
| Module consultation | `/consultations` | Choix créer / liste, consultations en cours |
| Nouvelle consultation | `/consultations/nouvelle` | Étape 1 identité courte · étape 2 choix des motifs |
| Consultation | `/consultations/:id` | Parcours en 4 étapes : motifs, interrogatoire, prescriptions, compte rendu |
| Registre | `/consultations/liste` | Filtres période / statut / type / praticien + export Excel |
| Fichier patients | `/patients` | Filtres sexe, tranche d'âge, assurance, ville + export Excel |
| Fiche patient | `/patients/nouveau`, `/patients/:id/modifier` | Identité, sécurité sociale, adresse, contact, dossier |
| Dossier médical | `/patients/:id` | Onglets consultations, comptes rendus, ordonnances, examens, antécédents, documents |
| Examens | `/examens` | Une ligne par patient ; filtres, export Excel |
| Examens d'un patient | `/examens/:patientId` | Saisie des résultats et évolution dans le temps |
| Comptes rendus | `/comptes-rendus` | Filtres période / statut / catégorie + export Excel |
| Éditeur de CR | `/comptes-rendus/:id` | Modèle appliqué, variables résolues, aperçu papier, validation et signature |
| Protocoles | `/protocoles` | Ordonnances types du médecin, rattachées aux motifs |
| Modèles de CR | `/modeles` | En-tête / corps / pied, variables cliquables, aperçu sur dossier d'exemple |

### Le parcours de consultation

La consultation n'est plus une fiche à panneaux mais un parcours linéaire. L'étape
atteinte est mémorisée dans `consultations.etape` : une consultation interrompue se
reprend là où elle s'est arrêtée.

**Identification.** La recherche d'abord — un patient déjà au fichier ne demande aucune
saisie. Pour une création, onze champs : identité, assurance, adresse. L'âge seul suffit
quand la date de naissance est inconnue ; le taux de couverture reprend celui le plus
souvent saisi pour cet organisme, jamais un barème inventé.

**1. Motifs.** Les neuf grilles en tuiles, sélection multiple, « Interrogatoire général »
pré-coché. Le compteur indique le nombre réel de questions après mutualisation.

**2. Interrogatoire.** Les constantes en tête — poids, taille, tension, température, plus
celles qu'appelle le motif : tour de taille en obésité, DEXTRO en diabète. L'IMC se calcule
seul. Puis la grille fusionnée, trois états par signe, navigation au clavier `+` `−` `0`
avec descente automatique du curseur. « Tout marquer absent » complète une rubrique sans
écraser les signes déjà notés présents.

À la validation, le texte composé alimente `histoire_maladie` et `antecedents`. Ces
colonnes changent de rôle : elles ne sont plus saisies, elles sont produites.

**3. Conclusion et prescriptions.** Dans l'ordre du raisonnement clinique :

1. **Examen clinique** — constatations à l'examen physique
2. **Diagnostic retenu**, saisi à la main — il ne sort pas des grilles, qui recueillent des
   signes et non une conclusion, et c'est lui qui ouvre le compte rendu
3. **Examens proposés** selon les motifs : socle pré-coché, conditionnels et doublons non
   cochés
4. **Ordonnance**, vide par défaut, avec les protocoles du médecin proposés en un clic
5. **Conduite à tenir**

La facturation ne figure plus dans le parcours.

**4. Compte rendu.** Généré automatiquement à l'arrivée sur l'étape, depuis le modèle
rattaché au motif ou le modèle par défaut. Entièrement modifiable ; « Régénérer » revient
au modèle en écrasant les retouches. Validation, signature, impression. La facturation se
renseigne ici, au moment de clôturer.

### Où les données vont

| Étape | Écrit dans |
|---|---|
| Motifs | `consultation_motifs` |
| Interrogatoire | `consultation_reponses`, `consultation_parametres`, puis `consultations.histoire_maladie` et `.antecedents` |
| Prescriptions | `consultations.diagnostic`, `.code_cim10`, `.conduite_a_tenir`, `.examen_clinique` · `examens_demandes` · `ordonnances` + `ordonnance_lignes` |
| Compte rendu | `comptes_rendus` (un seul de catégorie « Consultation » par consultation) |

### Le champ « Autre (préciser) »

Chaque rubrique de chaque grille se termine par un champ de saisie libre, affiché sur
toute la largeur et détaché des autres lignes. Il est propre à sa rubrique et non
partagé : le texte saisi sous « Signes d'hyperthyroïdie » reste rattaché à cette rubrique
dans le compte rendu, au lieu de tomber dans un fourre-tout en fin de document.

L'intitulé « Autre (préciser) » est fixé dans l'interface ; en base l'item garde son
libellé « Autres » et sa catégorie `autre`. Le script `supabase/ajouter_autre.sql`
garantit qu'aucune rubrique n'en est dépourvue — **rejouez-le après chaque création de
rubrique** par le médecin. La mention « (préciser) » est une consigne de
saisie : elle n'apparaît pas dans le compte rendu, qui reprend simplement « Autre : … ».

### Le module Examens

Écran **Examens** dans le menu. La liste affiche **une ligne par patient** — nom, numéro de
dossier, nombre d'examens, résultats restant à saisir — triée en mettant d'abord les
urgents, puis les attentes les plus anciennes. Filtres par état, type, période et urgence,
export Excel de la liste à plat.

Le clic sur un patient ouvre son détail, en deux parties :

- **Résultats à renseigner.** Un champ par examen, `Entrée` valide. Sous chaque ligne, les
  trois dernières valeurs du même examen sont rappelées, avec l'écart chiffré dès que la
  nouvelle valeur est tapée.
- **Évolution.** Chaque examen dans l'ordre chronologique, toutes ses mesures côte à côte,
  la plus récente mise en évidence. Les valeurs restent modifiables sur place — une faute
  de frappe se corrige sans passer par la consultation.

L'écart entre deux mesures est indiqué en valeur et en pourcentage, **sans jugement** :
une hausse n'est ni bonne ni mauvaise selon l'examen, l'interprétation revient au médecin.

Les résultats sont également accessibles depuis l'onglet *Examens* du dossier patient, et
disponibles dans les modèles de compte rendu via `{{examens.resultats}}`.

### La mutualisation des questions

35 questions des documents source figurent dans plusieurs motifs — l'asthénie dans cinq
d'entre eux. La contrainte `unique (consultation_id, item_id)` fait qu'un signe partagé
n'est stocké, donc demandé, qu'une seule fois : il s'affiche dans chaque rubrique prévue
par le médecin, avec une réponse commune signalée par une icône de lien.

Même principe sur les bilans : 18 examens sont communs à plusieurs motifs. Un patient vu
pour hypophyse et gonades ne se voit prescrire qu'une seule prolactine.

### Les bilans proposés

Cocher un motif propose son bilan sur l'écran d'examens : le socle pré-coché, les
examens conditionnels décochés avec leur condition affichée en clair, les doublons barrés.
Les bilans absents des documents source (parathyroïdes, gonades, obésité) portent la
mention « proposition à valider » jusqu'à confirmation du médecin.

### L'aide à la saisie

- **Abréviations dépliables** dans tous les panneaux de texte : `ecn` puis espace écrit
  « Examen clinique sans particularité. » Le médecin ajoute les siennes dans la table
  `abreviations`.
- **Autocomplétion apprise** sur les motifs, conventions, quartiers, examens et
  médicaments. Le diagnostic en est volontairement exclu : il se saisit à la main. Chaque saisie incrémente sa fréquence : au bout de quelques semaines la liste
  reflète les habitudes réelles du praticien.

### Les protocoles de prescription

Écran **Protocoles** dans le menu. Le médecin y compose ses ordonnances types et les
rattache à un motif ; elles apparaissent alors en pastilles sur l'étape de prescription.

Les tables `protocoles` et `protocoles_lignes` sont livrées **vides**. Aucun des documents
source ne contient de médicament : le contenu thérapeutique vient du médecin, jamais du
logiciel. Les protocoles sont proposés, jamais pré-cochés.

### Les modèles de compte rendu

Le corps du modèle contient des variables `{{...}}` remplacées par les données du
dossier au moment de la rédaction. Exemple :

```
Patient : {{patient.nom}} {{patient.prenom}}
Dossier n° {{patient.code}} — {{patient.sexe}}, {{patient.age}} ans
Constantes : {{parametres.tous}}

DIAGNOSTIC
{{consultation.diagnostic}}
```

Cinq familles de variables sont disponibles (patient, assurance, consultation,
constantes, médecin et document) et s'insèrent au curseur en un clic. Les variables
mal orthographiées restent visibles dans le texte : la faute se voit à l'écran plutôt
que sur le document imprimé. Le catalogue complet est dans `src/lib/templates.js`.

---

## Deux points de sécurité à traiter avant la mise en production

**1. Le RLS est désactivé.** C'est ce qui a été demandé, et c'est pratique en
développement, mais cela signifie que la clé publishable — visible par n'importe qui
dans le code du navigateur — donne un accès complet en lecture et en écriture à tous
les dossiers patients. Pour des données de santé, c'est à corriger avant tout usage
réel. Le bas de `supabase/schema.sql` contient les politiques à activer.

**2. La clé `sb_secret_...` a circulé en clair.** Considérez-la comme compromise et
révoquez-la dans *Settings → API Keys*. Elle n'est utilisée nulle part dans ce
projet : le frontend ne travaille qu'avec la clé publishable. Même remarque pour le
mot de passe de la base.

---

## Structure du projet

```
src/
├── lib/
│   ├── supabase.js      client Supabase
│   ├── format.js        dates FR, FCFA, âge, IMC
│   ├── excel.js         export xlsx (chargé à la demande)
│   └── templates.js     catalogue de variables et moteur de fusion
├── context/AuthContext.jsx
├── components/
│   ├── AppShell.jsx     navigation, garde de route, fil d'Ariane
│   ├── ui.jsx           champs, panneaux, modales, puces de statut
│   ├── ChampsAssistes.jsx  autocomplétion apprise, abréviations dépliables
│   ├── DataToolbar.jsx  barre de filtres et bouton d'export
│   ├── MotifSelector.jsx   tuiles de motifs avec comptage mutualisé
│   ├── Interrogatoire.jsx  grille fusionnée à trois états
│   ├── etapes/
│   │   ├── EtapeInterrogatoire.jsx  constantes + grille
│   │   ├── EtapePrescriptions.jsx   diagnostic, examens, ordonnance
│   │   └── EtapeCompteRendu.jsx     génération, retouche, clôture
│   ├── PatientPicker.jsx
│   ├── OrdonnanceModale.jsx
│   └── ExamensModale.jsx
└── pages/               13 écrans, dont Consultation.jsx (orchestrateur du parcours)
```

## Pistes d'évolution

- Dépôt de fichiers via Supabase Storage pour l'onglet Documents
- Export PDF côté serveur au lieu de l'impression navigateur
- Saisie des résultats d'examens par le laboratoire
- Statistiques d'activité : motifs les plus fréquents, recettes par période
- Mode hors ligne pour les coupures réseau
