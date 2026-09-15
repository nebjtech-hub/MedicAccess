-- =====================================================================
--  MedicAccess Gabon — Retrait du codage CIM-10
--  Le diagnostic se saisit librement ; le codage n'est plus employé.
--  À exécuter après les autres scripts. Relançable.
-- =====================================================================

-- 1. La variable disparaît des modèles de compte rendu existants
update modeles_compte_rendu
   set corps  = replace(coalesce(corps,  ''), ' {{consultation.code_cim10}}', ''),
       entete = replace(coalesce(entete, ''), ' {{consultation.code_cim10}}', ''),
       pied   = replace(coalesce(pied,   ''), ' {{consultation.code_cim10}}', '');

update modeles_compte_rendu
   set corps  = replace(coalesce(corps,  ''), '{{consultation.code_cim10}}', ''),
       entete = replace(coalesce(entete, ''), '{{consultation.code_cim10}}', ''),
       pied   = replace(coalesce(pied,   ''), '{{consultation.code_cim10}}', '');

-- 2. Les diagnostics préchargés quittent l'autocomplétion
delete from suggestions where domaine = 'diagnostic';

-- 3. La colonne est conservée : les consultations déjà codées gardent leur
--    valeur, et le retour arrière reste possible. Décommentez pour l'effacer.
comment on column consultations.code_cim10 is
  'Déprécié — le codage CIM-10 a été retiré du parcours de consultation.';

-- alter table consultations drop column if exists code_cim10;

-- Vérification
select (select count(*) from suggestions where domaine = 'diagnostic')            as diagnostics_restants,
       (select count(*) from modeles_compte_rendu
         where coalesce(corps,'') like '%code_cim10%')                            as modeles_a_nettoyer;
