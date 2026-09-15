-- =====================================================================
--  MedicAccess Gabon — Correction de l'erreur
--  « duplicate key value violates unique constraint idx_cr_consultation_auto »
--
--  L'index unique imposait un seul compte rendu de consultation par
--  consultation. Dès qu'un document existait, toute nouvelle génération
--  échouait. Il est remplacé par un index de recherche non unique ;
--  l'application reprend désormais le compte rendu le plus récent.
--
--  À exécuter dans le SQL Editor. Relançable.
-- =====================================================================

-- 1. État des lieux : y a-t-il des doublons ?
select consultation_id, count(*) as nb
  from comptes_rendus
 where categorie = 'Consultation' and consultation_id is not null
 group by consultation_id
having count(*) > 1;

-- 2. L'index unique cède la place à un index de recherche
drop index if exists idx_cr_consultation_auto;

create index if not exists idx_cr_consultation
  on comptes_rendus (consultation_id, categorie);

-- =====================================================================
--  3. FACULTATIF — supprimer les doublons
--
--  Inutile au fonctionnement : l'application prend le plus récent et
--  ignore les autres. À ne lancer que pour faire le ménage, et APRÈS
--  avoir vérifié le résultat de la requête 1 ci-dessus : un doublon peut
--  être un document retouché à la main que vous ne voulez pas perdre.
--
--  Conserve le compte rendu le plus RÉCENT de chaque consultation.
-- =====================================================================
-- delete from comptes_rendus a
--  where a.categorie = 'Consultation'
--    and a.consultation_id is not null
--    and exists (
--      select 1 from comptes_rendus b
--       where b.consultation_id = a.consultation_id
--         and b.categorie = 'Consultation'
--         and b.created_at > a.created_at
--    );

-- 4. Vérification
select count(*) as comptes_rendus_consultation
  from comptes_rendus where categorie = 'Consultation';
