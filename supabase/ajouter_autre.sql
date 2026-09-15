-- =====================================================================
--  MedicAccess Gabon — « Autre » en fin de chaque rubrique
--
--  Ajoute un champ de saisie libre à la fin de CHAQUE rubrique de CHAQUE
--  grille : après « Allergies », après « NEM », après le dernier signe de
--  chaque liste, sans exception.
--
--  Aucune modification de structure : ni table, ni colonne, ni type.
--  Uniquement des lignes ajoutées dans `items` et `grille_items`.
--  Le libellé reste « Autres » ; l'interface affiche « Autre (préciser) ».
--
--  Relançable : rejouez-le après chaque création de rubrique.
-- =====================================================================

do $$
declare
  s        record;
  v_item   uuid;
  v_code   text;
  v_ordre  int;
  v_ajouts int := 0;
begin
  for s in
    select gs.id as section_id, gs.titre, g.nom as grille
      from grille_sections gs
      join grilles g on g.id = gs.grille_id
     order by g.ordre, gs.ordre
  loop
    -- Un item propre à chaque rubrique : le texte saisi sous « Antécédents
    -- familiaux » reste rattaché à cette rubrique dans le compte rendu,
    -- au lieu de tomber dans un fourre-tout commun.
    v_code := 'autres_' || replace(s.section_id::text, '-', '');

    insert into items (code, libelle, type, categorie)
         values (v_code, 'Autres', 'texte', 'autre')
    on conflict (code) do nothing;

    select id into v_item from items where code = v_code;

    -- Toujours en dernière position de sa rubrique
    select coalesce(max(ordre), 0) + 1 into v_ordre
      from grille_items where section_id = s.section_id;

    if not exists (
      select 1 from grille_items
       where section_id = s.section_id and item_id = v_item
    ) then
      insert into grille_items (section_id, item_id, ordre)
           values (s.section_id, v_item, v_ordre);
      v_ajouts := v_ajouts + 1;
      raise notice 'Ajouté : % — %', s.grille, s.titre;
    else
      -- Déjà présent : on s'assure seulement qu'il ferme bien la rubrique
      update grille_items set ordre = v_ordre
       where section_id = s.section_id and item_id = v_item;
    end if;
  end loop;

  raise notice '--- % rubrique(s) complétée(s) ---', v_ajouts;
end $$;

-- =====================================================================
--  Vérification : « sans_champ_libre » doit valoir 0
-- =====================================================================
select
  (select count(*) from grille_sections)                       as rubriques,
  (select count(*) from items where categorie = 'autre')       as champs_libres,
  (select count(*) from grille_sections gs
     where not exists (
       select 1 from grille_items gi
         join items i on i.id = gi.item_id
        where gi.section_id = gs.id and i.categorie = 'autre'
     ))                                                        as sans_champ_libre;

-- Contrôle visuel sur les deux rubriques de vos captures d'écran
select g.nom as grille, gs.titre as rubrique, i.libelle, gi.ordre
  from grille_items gi
  join grille_sections gs on gs.id = gi.section_id
  join grilles g          on g.id  = gs.grille_id
  join items i            on i.id  = gi.item_id
 where g.code = 'general'
   and gs.titre in ('Antécédents personnels', 'Antécédents familiaux')
 order by gs.titre, gi.ordre;
