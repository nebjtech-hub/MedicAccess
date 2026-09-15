-- =====================================================================
--  MedicAccess Gabon — Refonte du parcours de consultation
--  À exécuter APRÈS schema.sql et grilles_endocrinologie.sql.
--  Relançable sans risque : aucune donnée n'est supprimée.
--
--  La consultation n'est plus une fiche à panneaux mais un parcours en
--  quatre étapes. Les colonnes narratives de `consultations` changent de
--  rôle : elles ne sont plus saisies à la main, elles sont PRODUITES par
--  l'interrogatoire. On les conserve parce que les modèles de compte
--  rendu s'appuient dessus et qu'elles gardent une trace modifiable.
-- =====================================================================

-- ---------------------------------------------------------- progression
alter table consultations
  add column if not exists etape text default 'motifs'
    check (etape in ('motifs', 'interrogatoire', 'prescriptions', 'compte_rendu', 'terminee'));

comment on column consultations.etape is
  'Étape atteinte dans le parcours : permet de reprendre une consultation interrompue.';

-- Les consultations déjà ouvertes reprennent au début du parcours
update consultations set etape = 'motifs' where etape is null;

-- ------------------------------------------- modèle de CR par motif
alter table modeles_compte_rendu
  add column if not exists grille_id uuid references grilles(id) on delete set null,
  add column if not exists par_defaut boolean default false;

comment on column modeles_compte_rendu.grille_id is
  'Motif auquel ce modèle se rattache. Le compte rendu est généré avec le modèle du premier motif retenu, sinon avec le modèle par défaut.';

-- Le modèle générique existant devient le modèle de repli
update modeles_compte_rendu
   set par_defaut = true
 where nom = 'Compte rendu de consultation'
   and grille_id is null;

-- --------------------------------------------- protocoles par motif
-- La table existe déjà (créée vide par grilles_endocrinologie.sql).
-- On s'assure seulement de l'index de recherche par motif.
create index if not exists idx_protocoles_grille on protocoles (grille_id) where actif;

-- ------------------------------------------ lien compte rendu ↔ étape
-- Index de recherche simple. Volontairement NON unique : contraindre à un
-- seul compte rendu par consultation empêchait d'en produire une seconde
-- version, et faisait échouer la génération dès qu'un document existait.
-- C'est l'application qui reprend le plus récent.
create index if not exists idx_cr_consultation
  on comptes_rendus (consultation_id, categorie);

-- =====================================================================
--  Nouvelles variables disponibles dans les modèles de compte rendu
-- =====================================================================
--   {{consultation.motifs}}          motifs retenus, séparés par des virgules
--   {{interrogatoire.antecedents}}   antécédents et mode de vie recueillis
--   {{interrogatoire.histoire}}      signes et symptômes recueillis
--   {{interrogatoire.complet}}       l'intégralité de l'interrogatoire
--   {{examens.demandes}}             examens prescrits ce jour
--   {{ordonnance.lignes}}            traitement prescrit ce jour
--
--  Le modèle de repli est mis à jour pour les employer.
-- =====================================================================
update modeles_compte_rendu
   set corps = E'Patient : {{patient.nom}} {{patient.prenom}}\nDossier n° {{patient.code}} — {{patient.sexe}}, {{patient.age}} ans (né(e) le {{patient.date_naissance}})\nAssurance : {{patient.organisme}} — {{patient.numero_secu}}\n\nMOTIF DE CONSULTATION\n{{consultation.motifs}}\n{{consultation.motif}}\n\nANTÉCÉDENTS ET MODE DE VIE\n{{interrogatoire.antecedents}}\n\nHISTOIRE DE LA MALADIE ET SIGNES RECUEILLIS\n{{interrogatoire.histoire}}\n\nEXAMEN CLINIQUE\nConstantes : {{parametres.tous}}\n{{consultation.examen_clinique}}\n\nDIAGNOSTIC RETENU\n{{consultation.diagnostic}}\n\nCONDUITE À TENIR\n{{consultation.conduite_a_tenir}}\n\nEXAMENS PRESCRITS\n{{examens.demandes}}\n\nTRAITEMENT PRESCRIT\n{{ordonnance.lignes}}'
 where par_defaut = true;

-- =====================================================================
--  Vérification
-- =====================================================================
select (select count(*) from consultations where etape is not null) as consultations_avec_etape,
       (select count(*) from modeles_compte_rendu where par_defaut)  as modele_par_defaut,
       (select count(*) from protocoles)                            as protocoles;
