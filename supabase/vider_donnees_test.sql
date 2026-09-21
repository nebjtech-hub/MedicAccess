-- =====================================================================
--  MedicAccess Gabon — Remise à zéro des données de test
--
--  SUPPRIME : patients, consultations, réponses d'interrogatoire,
--             constantes, comptes rendus, ordonnances, examens,
--             antécédents, documents.
--
--  CONSERVE : le ou les comptes médecins et leur authentification,
--             les 9 grilles et leurs items, les bilans, les modèles de
--             compte rendu, les protocoles, les abréviations.
--
--  IRRÉVERSIBLE. Vérifiez le projet Supabase avant de lancer.
--  Exécutez d'abord la section 0 pour voir ce qui va disparaître.
-- =====================================================================

-- ---------------------------------------------------------------------
--  0. ÉTAT DES LIEUX — à lancer seul d'abord
-- ---------------------------------------------------------------------
select 'patients'               as table_, count(*) from patients
union all select 'consultations',            count(*) from consultations
union all select 'consultation_reponses',    count(*) from consultation_reponses
union all select 'consultation_parametres',  count(*) from consultation_parametres
union all select 'consultation_motifs',      count(*) from consultation_motifs
union all select 'comptes_rendus',           count(*) from comptes_rendus
union all select 'ordonnances',              count(*) from ordonnances
union all select 'ordonnance_lignes',        count(*) from ordonnance_lignes
union all select 'examens_demandes',         count(*) from examens_demandes
union all select 'antecedents',              count(*) from antecedents
union all select 'documents',                count(*) from documents
union all select '— conservés —',            null
union all select 'medecins',                 count(*) from medecins
union all select 'grilles',                  count(*) from grilles
union all select 'items',                    count(*) from items
union all select 'bilan_examens',            count(*) from bilan_examens
union all select 'modeles_compte_rendu',     count(*) from modeles_compte_rendu
order by 1;

-- ---------------------------------------------------------------------
--  1. SUPPRESSION — dans l'ordre des dépendances
--     (delete plutôt que truncate : aucune table n'est touchée par
--     ricochet, ce qui est plus sûr quand on ne voit pas la base)
-- ---------------------------------------------------------------------
delete from consultation_reponses;
delete from consultation_parametres;
delete from consultation_motifs;
delete from ordonnance_lignes;
delete from ordonnances;
delete from comptes_rendus;
delete from examens_demandes;
delete from documents;
delete from antecedents;
delete from consultations;
delete from patients;

-- ---------------------------------------------------------------------
--  2. NUMÉROTATION — on repart des valeurs d'origine
--     Le prochain patient reprendra le code 110001-26.
-- ---------------------------------------------------------------------
select setval('patient_code_seq',     110001, false);
select setval('consultation_num_seq',      1, false);
select setval('cr_num_seq',                1, false);
select setval('ordonnance_num_seq',        1, false);

-- ---------------------------------------------------------------------
--  3. AUTOCOMPLÉTION — facultatif
--     Les fréquences apprises pendant les tests ne reflètent rien.
--     Décommentez pour repartir d'une autocomplétion neutre.
-- ---------------------------------------------------------------------
-- update suggestions set frequence = 0;

--  Pour supprimer aussi les valeurs saisies pendant les tests et ne
--  garder que les listes livrées (quartiers, motifs, examens des bilans) :
-- delete from suggestions
--  where domaine in ('medicament', 'convention')
--     or (domaine = 'examen'
--         and valeur not in (select libelle from bilan_examens));

-- ---------------------------------------------------------------------
--  4. COMPTES MÉDECINS — à ne toucher que si vous en avez créé plusieurs
--     Lancez le select pour voir la liste, puis décommentez le delete en
--     remplaçant l'adresse par celle du compte à CONSERVER.
--     Supprimer la fiche ne supprime pas l'authentification : passez
--     ensuite par Authentication > Users pour retirer le compte.
-- ---------------------------------------------------------------------
select id, email, civilite, nom, prenom, specialite, created_at
  from medecins order by created_at;

-- delete from medecins where email <> 'ziza@centrediagnostic.ga';

-- ---------------------------------------------------------------------
--  5. VÉRIFICATION — tout doit être à zéro à gauche, intact à droite
-- ---------------------------------------------------------------------
select
  (select count(*) from patients)             as patients,
  (select count(*) from consultations)        as consultations,
  (select count(*) from comptes_rendus)       as comptes_rendus,
  (select count(*) from examens_demandes)     as examens,
  (select count(*) from medecins)             as medecins_conserves,
  (select count(*) from grilles)              as grilles_conservees,
  (select count(*) from items)                as items_conserves,
  (select count(*) from bilan_examens)        as examens_bilans_conserves;
