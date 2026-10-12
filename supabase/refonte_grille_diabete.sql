-- =====================================================================
--  MedicAccess Gabon — Réorganisation de la grille Diabète et lipides
--
--  · Ordre revu : Facteurs de risque → Situation → branche → Complications
--  · Les cinq rubriques de complications sont regroupées sous un volet
--    unique, placé en dernier
--  · « Circonstances de découverte » devient conditionnelle au diabète
--    de novo
--  · Situation accueille Prédiabète et Diabète gestationnel
--  · Antécédents personnels complétés
--
--  À exécuter après tous les scripts précédents. Relançable.
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. REGROUPEMENT DE RUBRIQUES
--     Plusieurs rubriques peuvent partager un même volet, affiché une
--     seule fois au-dessus d'elles.
-- ---------------------------------------------------------------------
alter table grille_sections add column if not exists groupe text;

comment on column grille_sections.groupe is
  'Volet regroupant plusieurs rubriques affichées à la suite. Null = rubrique autonome.';

-- ---------------------------------------------------------------------
--  2. SITUATION — deux situations supplémentaires
-- ---------------------------------------------------------------------
update items
   set options = '["Diabète de novo","Diabète connu","Prédiabète","Diabète gestationnel"]'::jsonb
 where code = 'situation_diabete';

-- ---------------------------------------------------------------------
--  3. ANTÉCÉDENTS PERSONNELS (interrogatoire général)
-- ---------------------------------------------------------------------
do $$
declare v_sec uuid; v_o int;
begin
  select gs.id into v_sec
    from grille_sections gs join grilles g on g.id = gs.grille_id
   where g.code = 'general' and gs.titre = 'Antécédents personnels';
  if v_sec is null then return; end if;

  select coalesce(max(ordre), 0) into v_o from grille_items where section_id = v_sec;

  insert into grille_items (section_id, item_id, ordre)
  select v_sec, i.id, v_o + x.ord
    from (values ('prediabete', 1), ('diabete_gestationnel', 2), ('macrosomie_foetale', 3)) as x(code, ord)
    join items i on i.code = x.code
  on conflict (section_id, item_id) do nothing;
end $$;

-- ---------------------------------------------------------------------
--  4. GRILLE DIABÈTE — ordre, conditions et regroupement
-- ---------------------------------------------------------------------
do $$
declare
  v_grille uuid;
  r        record;
begin
  select id into v_grille from grilles where code = 'diabete';
  if v_grille is null then
    raise notice 'Grille diabète absente.';
    return;
  end if;

  -- Ordre d'affichage voulu par le médecin
  for r in select * from (values
    ('Facteurs de risque cardiovasculaire',        1,  null,  null),
    ('Situation',                                   2,  null,  null),
    ('Antécédents personnels — diabète de novo',    3,  'Diabète de novo', null),
    ('Circonstances de découverte',                 4,  'Diabète de novo', null),
    ('Suivi — diabète connu',                       5,  'Diabète connu',   null),
    ('Symptômes',                                   6,  null,  null),
    ('Métabolisme lipidique',                       7,  null,  null),
    -- volet unique « Complications », en dernier
    ('Neuropathie diabétique',                      8,  null,  'Complications'),
    ('Complications vasculaires',                   9,  null,  'Complications'),
    ('Complications ophtalmologiques',             10,  null,  'Complications'),
    ('Complications rénales',                      11,  null,  'Complications'),
    ('Pied diabétique',                            12,  null,  'Complications')
  ) as t(titre, ordre, condition, groupe)
  loop
    update grille_sections
       set ordre               = r.ordre,
           groupe              = r.groupe,
           condition_item_code = case when r.condition is null then null else 'situation_diabete' end,
           condition_valeur    = r.condition
     where grille_id = v_grille and titre = r.titre;
  end loop;

  -- Les rubriques non citées passent après, sans perturber l'ordre ci-dessus
  update grille_sections
     set ordre = ordre + 100
   where grille_id = v_grille
     and titre not in (
       'Facteurs de risque cardiovasculaire', 'Situation',
       'Antécédents personnels — diabète de novo', 'Circonstances de découverte',
       'Suivi — diabète connu', 'Symptômes', 'Métabolisme lipidique',
       'Neuropathie diabétique', 'Complications vasculaires',
       'Complications ophtalmologiques', 'Complications rénales', 'Pied diabétique'
     )
     and ordre < 100;
end $$;

-- Les intitulés des sous-rubriques du volet Complications s'allègent :
-- le volet porte déjà le mot.
update grille_sections gs
   set titre = case gs.titre
     when 'Complications vasculaires'       then 'Vasculaires'
     when 'Complications ophtalmologiques'  then 'Ophtalmologiques'
     when 'Complications rénales'           then 'Rénales'
     else gs.titre end
  from grilles g
 where g.id = gs.grille_id and g.code = 'diabete' and gs.groupe = 'Complications';

-- ---------------------------------------------------------------------
--  Vérification — l'ordre d'affichage de la grille diabète
-- ---------------------------------------------------------------------
select gs.ordre, gs.titre, gs.groupe, gs.condition_valeur,
       (select count(*) from grille_items gi where gi.section_id = gs.id) as items
  from grille_sections gs
  join grilles g on g.id = gs.grille_id
 where g.code = 'diabete'
 order by gs.ordre;
