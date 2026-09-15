-- =====================================================================
--  MedicAccess Gabon — Modifications issues de la réunion avec le médecin
--
--  À exécuter APRÈS schema.sql, grilles_endocrinologie.sql et
--  refonte_consultation.sql. Migration incrémentale : rien n'est
--  supprimé, les réponses d'interrogatoire déjà saisies sont conservées.
--  Relançable sans effet de bord.
--
--  IMPORTANT : si vous rejouez un jour grilles_endocrinologie.sql, les
--  rubriques sont recréées avec de nouveaux identifiants ; il faut alors
--  rejouer ce script derrière.
-- =====================================================================

-- ---------------------------------------------------------- utilitaires
create or replace function _lier(p_grille text, p_section text, p_item text)
returns void language plpgsql as $$
declare v_sec uuid; v_it uuid; v_o int;
begin
  select gs.id into v_sec
    from grille_sections gs join grilles g on g.id = gs.grille_id
   where g.code = p_grille and gs.titre = p_section;
  select id into v_it from items where code = p_item;
  if v_sec is null or v_it is null then
    raise notice 'Lien ignoré : % / % / %', p_grille, p_section, p_item;
    return;
  end if;
  select coalesce(max(ordre), 0) + 1 into v_o from grille_items where section_id = v_sec;
  insert into grille_items (section_id, item_id, ordre)
       values (v_sec, v_it, v_o)
  on conflict (section_id, item_id) do nothing;
end $$;

create or replace function _delier(p_grille text, p_section text, p_item text)
returns void language plpgsql as $$
declare v_sec uuid; v_it uuid;
begin
  select gs.id into v_sec
    from grille_sections gs join grilles g on g.id = gs.grille_id
   where g.code = p_grille and gs.titre = p_section;
  select id into v_it from items where code = p_item;
  if v_sec is null or v_it is null then return; end if;
  delete from grille_items where section_id = v_sec and item_id = v_it;
end $$;

create or replace function _ajouter_examen(
  p_grille text, p_bloc text, p_libelle text, p_code text,
  p_type text default 'Laboratoire', p_condition text default null)
returns void language plpgsql as $$
declare v_bloc uuid; v_o int;
begin
  select bb.id into v_bloc
    from bilan_blocs bb join grilles g on g.id = bb.grille_id
   where g.code = p_grille and bb.titre = p_bloc;
  if v_bloc is null then
    raise notice 'Bloc de bilan introuvable : % / %', p_grille, p_bloc;
    return;
  end if;
  if exists (select 1 from bilan_examens where bloc_id = v_bloc and libelle = p_libelle) then
    return;
  end if;
  select coalesce(max(ordre), 0) + 1 into v_o from bilan_examens where bloc_id = v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
       values (v_bloc, p_libelle, p_code, p_type, p_condition is not null, p_condition, v_o);
end $$;

-- =====================================================================
--  1. NOUVEAUX ITEMS
-- =====================================================================
insert into items (code, libelle, type, categorie) values
  ('bosse_de_bison',          'Bosse de bison',                  'booleen', 'signe'),
  ('facies_lunaire',          'Faciès lunaire',                  'booleen', 'signe'),
  ('extremites_greles',       'Extrémités grêles',               'booleen', 'signe'),
  ('infarctus_myocarde',      'Infarctus du myocarde',           'booleen', 'antecedent'),
  ('obesite_personnelle',     'Obésité',                         'booleen', 'signe'),
  ('baisse_acuite_visuelle',  'Baisse de l''acuité visuelle',    'booleen', 'signe'),
  ('amputation_champ_visuel', 'Amputation du champ visuel',      'booleen', 'signe'),
  ('ptosis',                  'Ptosis',                          'booleen', 'signe'),
  ('ophtalmoplegie',          'Ophtalmoplégie',                  'booleen', 'signe')
on conflict (code) do nothing;

-- Libellé revu : « Découverte fortuite » plutôt qu'« Hyperglycémie fortuite »
update items set libelle = 'Découverte fortuite' where code = 'hyperglycemie_fortuite';

-- =====================================================================
--  2. DIABÈTE
-- =====================================================================
update grille_sections gs set titre = 'Neuropathie diabétique'
  from grilles g
 where g.id = gs.grille_id and g.code = 'diabete'
   and gs.titre = 'Complications neurologiques';

update grille_sections gs set titre = 'Facteurs de risque cardiovasculaire'
  from grilles g
 where g.id = gs.grille_id and g.code = 'diabete'
   and gs.titre = 'Facteurs de risque';

select _lier('diabete', 'Facteurs de risque cardiovasculaire', 'obesite_personnelle');
select _lier('diabete', 'Facteurs de risque cardiovasculaire', 'infarctus_myocarde');
select _lier('diabete', 'Facteurs de risque cardiovasculaire', 'avc');

-- =====================================================================
--  3. HYPOPHYSE
-- =====================================================================
-- Syndrome tumoral : « Troubles visuels » retiré, « Vomissements » ajouté
select _delier('hypophyse', 'Syndrome tumoral', 'troubles_visuels');
select _lier('hypophyse', 'Syndrome tumoral', 'vomissements');

-- Maladie de Cushing : morphotype
select _lier('hypophyse', 'Maladie de Cushing', 'bosse_de_bison');
select _lier('hypophyse', 'Maladie de Cushing', 'facies_lunaire');
select _lier('hypophyse', 'Maladie de Cushing', 'extremites_greles');

-- Insuffisance hypophysaire : pilosité à la place de l'intolérance au froid
select _delier('hypophyse', 'Insuffisance hypophysaire', 'intolerance_froid');
select _lier('hypophyse', 'Insuffisance hypophysaire', 'diminution_pilosite');

-- Nouvelle rubrique « Oculaire », insérée juste après le syndrome tumoral.
-- Reconstituée à partir des notes de réunion : marquée « à valider ».
do $$
declare v_grille uuid; v_sec uuid;
begin
  select id into v_grille from grilles where code = 'hypophyse';
  if v_grille is null then return; end if;
  if exists (select 1 from grille_sections where grille_id = v_grille and titre = 'Oculaire') then
    return;
  end if;
  update grille_sections set ordre = ordre + 1 where grille_id = v_grille and ordre >= 2;
  insert into grille_sections (grille_id, titre, ordre, a_valider)
       values (v_grille, 'Oculaire', 2, true) returning id into v_sec;
end $$;

select _lier('hypophyse', 'Oculaire', 'baisse_acuite_visuelle');
select _lier('hypophyse', 'Oculaire', 'amputation_champ_visuel');
select _lier('hypophyse', 'Oculaire', 'diplopie');
select _lier('hypophyse', 'Oculaire', 'ptosis');
select _lier('hypophyse', 'Oculaire', 'ophtalmoplegie');

-- =====================================================================
--  4. SURRÉNALES — mêmes signes morphologiques de Cushing
-- =====================================================================
select _lier('surrenales', 'Syndrome de Cushing', 'bosse_de_bison');
select _lier('surrenales', 'Syndrome de Cushing', 'facies_lunaire');
select _lier('surrenales', 'Syndrome de Cushing', 'extremites_greles');

-- =====================================================================
--  5. BILANS
-- =====================================================================
-- Diabète — retentissement rénal
select _ajouter_examen('diabete', 'Retentissement rénal', 'Microalbuminurie', 'MICROALB');
select _ajouter_examen('diabete', 'Retentissement rénal', 'Protéinurie des 24 h', 'PROT24');

-- Diabète — dépistage des complications
select _ajouter_examen('diabete', 'Dépistage des complications',
  'Échographie Doppler des membres inférieurs', 'DOPPLERMI', 'Imagerie');
select _ajouter_examen('diabete', 'Dépistage des complications',
  'Tomodensitométrie cérébrale', 'TDMCEREB', 'Imagerie', 'si signe d''appel neurologique');
select _ajouter_examen('diabete', 'Dépistage des complications',
  'Angio-TDM des membres inférieurs', 'ANGIOTDMMI', 'Imagerie',
  'si artériopathie confirmée ou IPS anormal');

-- Surrénales — hyperaldostéronisme et phéochromocytome
do $$
declare v_grille uuid; v_o int;
begin
  select id into v_grille from grilles where code = 'surrenales';
  if v_grille is null then return; end if;
  if not exists (select 1 from bilan_blocs
                  where grille_id = v_grille
                    and titre = 'Hyperaldostéronisme et phéochromocytome') then
    select coalesce(max(ordre), 0) + 1 into v_o from bilan_blocs where grille_id = v_grille;
    insert into bilan_blocs (grille_id, titre, ordre) values
      (v_grille, 'Hyperaldostéronisme et phéochromocytome', v_o);
  end if;
end $$;

select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Ionogramme sanguin', 'IONO');
select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Aldostérone plasmatique', 'ALDO');
select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Rénine', 'RENINE');
select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Rapport aldostérone / rénine', 'RARR');
select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Métanéphrines plasmatiques', 'METAPL');
select _ajouter_examen('surrenales', 'Hyperaldostéronisme et phéochromocytome',
  'Métanéphrines urinaires', 'METAUR');

-- Les nouveaux examens rejoignent l'autocomplétion
insert into suggestions (domaine, valeur, code, frequence)
select 'examen', libelle, code, 0 from bilan_examens
on conflict (domaine, valeur) do nothing;

-- =====================================================================
--  6. « AUTRES » EN FIN DE CHAQUE RUBRIQUE
--  Un item propre à chaque rubrique : le texte libre garde ainsi son
--  contexte dans le compte rendu, au lieu d'être versé dans un fourre-tout.
-- =====================================================================
do $$
declare s record; v_item uuid; v_code text; v_o int;
begin
  for s in select gs.id as section_id from grille_sections gs loop
    v_code := 'autres_' || replace(s.section_id::text, '-', '');

    insert into items (code, libelle, type, categorie)
         values (v_code, 'Autres', 'texte', 'autre')
    on conflict (code) do nothing;

    select id into v_item from items where code = v_code;
    select coalesce(max(ordre), 0) + 1 into v_o from grille_items where section_id = s.section_id;

    insert into grille_items (section_id, item_id, ordre)
         values (s.section_id, v_item, v_o)
    on conflict (section_id, item_id) do nothing;
  end loop;
end $$;

-- =====================================================================
--  7. FACTURATION RETIRÉE
--  Les colonnes sont conservées — les retirer casserait `reste_a_payer`
--  et les consultations déjà enregistrées — mais elles ne sont plus
--  alimentées ni affichées nulle part dans l'application.
--  Décommentez le bloc ci-dessous pour les supprimer définitivement.
-- =====================================================================
comment on column consultations.montant is
  'Déprécié — la facturation a été retirée du parcours de consultation.';
comment on column consultations.paiement is
  'Déprécié — la facturation a été retirée du parcours de consultation.';

-- alter table consultations
--   drop column if exists reste_a_payer,
--   drop column if exists montant,
--   drop column if exists paiement,
--   drop column if exists mode_paiement;

-- ---------------------------------------------------------- nettoyage
drop function if exists _lier(text, text, text);
drop function if exists _delier(text, text, text);
drop function if exists _ajouter_examen(text, text, text, text, text, text);

-- =====================================================================
--  Vérification
-- =====================================================================
select (select count(*) from items)                                as items,
       (select count(*) from items where categorie = 'autre')      as items_autres,
       (select count(*) from grille_sections)                      as sections,
       (select count(*) from grille_items)                         as liaisons,
       (select count(*) from bilan_examens)                        as examens;
