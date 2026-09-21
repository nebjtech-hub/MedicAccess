-- =====================================================================
--  MedicAccess Gabon — Correction du fonds CNAMGS : SP et non FP
--
--  À n'exécuter QUE si vous avez déjà lancé refonte_examens_calculs.sql
--  dans sa version précédente. Sinon, la version corrigée du script
--  principal suffit.
--
--  Relançable, aucune donnée perdue.
-- =====================================================================

-- Les fiches déjà saisies en « FP » basculent en « SP »
update patients set fonds_cnamgs = 'SP' where fonds_cnamgs = 'FP';

-- La contrainte accepte désormais GEF, AP et SP
alter table patients drop constraint if exists patients_fonds_cnamgs_check;
alter table patients add  constraint patients_fonds_cnamgs_check
  check (fonds_cnamgs is null or fonds_cnamgs in ('GEF', 'AP', 'SP'));

-- Vérification
select fonds_cnamgs, count(*) from patients group by fonds_cnamgs order by 1;
