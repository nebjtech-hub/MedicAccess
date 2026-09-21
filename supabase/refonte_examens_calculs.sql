-- =====================================================================
--  MedicAccess Gabon — Refonte examens, calculs et branche diabète
--
--  À exécuter APRÈS tous les scripts précédents. Migration incrémentale :
--  aucune donnée saisie n'est détruite. Relançable.
--
--  Contenu :
--    1. Unités sur les examens de laboratoire
--    2. Champ « Plaintes » sur la consultation
--    3. Fonds CNAMGS (GEF / AP / FP) à la place du taux de couverture
--    4. Rubriques conditionnées par une réponse
--    5. Branche « Diabète de novo » / « Diabète connu »
--    6. Antécédents familiaux complétés
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. UNITÉS
-- ---------------------------------------------------------------------
alter table bilan_examens    add column if not exists unite text;
alter table examens_demandes add column if not exists unite text;

comment on column examens_demandes.unite is
  'Unité du résultat, reprise du bilan type et modifiable à la saisie.';

-- Unités usuelles. Les concentrations sont exprimées comme sur les
-- comptes rendus des laboratoires de Libreville (g/L plutôt que mmol/L
-- pour la glycémie et le bilan lipidique) — à ajuster si le laboratoire
-- partenaire rend ses résultats autrement.
do $$
declare u record;
begin
  for u in select * from (values
    ('Glycémie à jeun','g/L'), ('Glycémie post-prandiale','g/L'), ('HbA1c','%'),
    ('Créatinine','mg/L'), ('DFG estimé','mL/min/1,73m²'), ('Urée','g/L'),
    ('Acide urique','mg/L'), ('Albuminémie','g/L'), ('Ionogramme sanguin','mmol/L'),
    ('Rapport albumine/créatinine urinaire','mg/g'), ('Microalbuminurie','mg/L'),
    ('Protéinurie des 24 h','g/24h'), ('ECBU','—'),
    ('Cholestérol total','g/L'), ('HDL cholestérol','g/L'), ('LDL cholestérol','g/L'),
    ('Triglycérides','g/L'),
    ('NFS','—'), ('CRP','mg/L'), ('Transaminases','UI/L'), ('Calcémie','mg/L'),
    ('TSH','µUI/mL'), ('TSH ultrasensible','µUI/mL'), ('TSH + FT4','µUI/mL'),
    ('FT4','pmol/L'), ('FT3','pmol/L'),
    ('TRAb','UI/L'), ('Anti-TPO','UI/mL'), ('Anti-thyroglobuline','UI/mL'),
    ('IGF-1','ng/mL'), ('GH','ng/mL'), ('Prolactine','ng/mL'),
    ('ACTH','pg/mL'), ('Cortisol','µg/dL'), ('Cortisolémie de 8 h','µg/dL'),
    ('Cortisolurie des 24 h','µg/24h'), ('Cortisol salivaire','ng/mL'),
    ('FSH','UI/L'), ('LH','UI/L'), ('Œstradiol','pg/mL'),
    ('Testostérone','ng/mL'), ('Testostérone totale','ng/mL'),
    ('21-hydroxylase','ng/mL'), ('11β-hydroxylase','ng/mL'),
    ('17α-hydroxylase','ng/mL'), ('3β-HSD','ng/mL'),
    ('Aldostérone plasmatique','pg/mL'), ('Rénine','pg/mL'),
    ('Rapport aldostérone / rénine','—'),
    ('Métanéphrines plasmatiques','pg/mL'), ('Métanéphrines urinaires','µg/24h'),
    ('Calcium ionisé','mmol/L'), ('Phosphorémie','mg/L'), ('PTH','pg/mL'),
    ('25-OH vitamine D','ng/mL'), ('Calciurie des 24 h','mg/24h'),
    ('Test de grossesse','UI/L'), ('Bandelette urinaire','—'),
    ('Âge osseux','ans'), ('Vitesse de croissance','cm/an'),
    ('Taille cible génétique','cm')
  ) as t(libelle, unite)
  loop
    update bilan_examens set unite = u.unite
     where libelle = u.libelle and (unite is null or unite = '');
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  2. PLAINTES — recueillies juste avant l'inspection
-- ---------------------------------------------------------------------
alter table consultations add column if not exists plaintes text;
comment on column consultations.plaintes is
  'Plaintes exprimées par le patient, recueillies avant l''examen physique.';

-- ---------------------------------------------------------------------
--  3. FONDS CNAMGS À LA PLACE DU TAUX DE COUVERTURE
--     GEF : Gabonais Économiquement Faibles
--     AP  : Agents Publics
--     SP  : Secteur Privé
-- ---------------------------------------------------------------------
alter table patients add column if not exists fonds_cnamgs text;

-- Contrainte posée à part : elle est ainsi corrigible sans toucher à la
-- colonne, et le script reste relançable.
alter table patients drop constraint if exists patients_fonds_cnamgs_check;
alter table patients add  constraint patients_fonds_cnamgs_check
  check (fonds_cnamgs is null or fonds_cnamgs in ('GEF', 'AP', 'SP'));

comment on column patients.taux_couverture is
  'Déprécié — remplacé par fonds_cnamgs.';

-- ---------------------------------------------------------------------
--  4. RUBRIQUES CONDITIONNELLES
--     Une rubrique peut ne s'afficher que si un item porte une valeur
--     donnée. Sert à la branche diabète, et à toute branche future.
-- ---------------------------------------------------------------------
alter table grille_sections
  add column if not exists condition_item_code text,
  add column if not exists condition_valeur    text;

comment on column grille_sections.condition_item_code is
  'Code de l''item qui conditionne l''affichage ; null = toujours affichée.';

-- ---------------------------------------------------------------------
--  5. BRANCHE DIABÈTE
-- ---------------------------------------------------------------------
insert into items (code, libelle, type, options, categorie) values
  ('situation_diabete', 'Situation', 'choix',
   '["Diabète de novo","Diabète connu"]'::jsonb, 'anamnese'),

  -- de novo : antécédents personnels à cocher
  ('prediabete',            'Prédiabète',                 'booleen', null, 'antecedent'),
  ('hyperuricemie',         'Hyperuricémie',              'booleen', null, 'antecedent'),
  ('diabete_gestationnel',  'Diabète gestationnel',       'booleen', null, 'antecedent'),
  ('macrosomie_foetale',    'Macrosomie fœtale',          'booleen', null, 'antecedent'),

  -- familiaux
  ('atcd_fam_mort_subite',  'Mort subite précoce',        'booleen', null, 'antecedent'),
  ('atcd_fam_avc_jeune',    'AVC chez le sujet jeune',    'booleen', null, 'antecedent'),

  -- diabète connu
  ('motif_suivi_diabete',   'Motif de la consultation',   'choix',
   '["Suivi du diabète","Résultats d''examens","Consultation post-hospitalisation","Autre"]'::jsonb,
   'anamnese'),
  ('debut_diabete',         'Début du diabète',           'texte',  null, 'anamnese'),
  ('traitement_en_cours',   'Traitement en cours',        'texte',  null, 'anamnese'),
  ('debut_hta',             'Début de l''HTA',            'texte',  null, 'antecedent'),
  ('date_avc',              'Date de l''AVC',             'texte',  null, 'antecedent'),
  ('traitement_dyslipidemie','Traitement de la dyslipidémie', 'texte', null, 'antecedent'),
  ('traitement_hyperuricemie','Traitement de l''hyperuricémie','texte', null, 'antecedent')
on conflict (code) do nothing;

-- Rubriques de la grille diabète
do $$
declare
  v_grille uuid;
  v_sec    uuid;
  v_item   uuid;
  v_o      int;
begin
  select id into v_grille from grilles where code = 'diabete';
  if v_grille is null then
    raise notice 'Grille diabète absente — script interrompu.';
    return;
  end if;

  -- 5.a  Rubrique « Situation », toute première
  if not exists (select 1 from grille_sections
                  where grille_id = v_grille and titre = 'Situation') then
    update grille_sections set ordre = ordre + 1 where grille_id = v_grille;
    insert into grille_sections (grille_id, titre, ordre)
         values (v_grille, 'Situation', 1) returning id into v_sec;
    select id into v_item from items where code = 'situation_diabete';
    insert into grille_items (section_id, item_id, ordre) values (v_sec, v_item, 1);
  end if;

  -- 5.b  Rubrique conditionnelle « Diabète de novo »
  if not exists (select 1 from grille_sections
                  where grille_id = v_grille and titre = 'Antécédents personnels — diabète de novo') then
    select coalesce(max(ordre), 0) + 1 into v_o from grille_sections where grille_id = v_grille;
    insert into grille_sections (grille_id, titre, ordre, condition_item_code, condition_valeur)
         values (v_grille, 'Antécédents personnels — diabète de novo', v_o,
                 'situation_diabete', 'Diabète de novo')
      returning id into v_sec;
    insert into grille_items (section_id, item_id, ordre)
    select v_sec, i.id, x.ord
      from (values ('hta',1), ('prediabete',2), ('dyslipidemie',3), ('hyperuricemie',4),
                   ('diabete_gestationnel',5), ('macrosomie_foetale',6)) as x(code, ord)
      join items i on i.code = x.code;
  end if;

  -- 5.c  Rubrique conditionnelle « Diabète connu »
  if not exists (select 1 from grille_sections
                  where grille_id = v_grille and titre = 'Suivi — diabète connu') then
    select coalesce(max(ordre), 0) + 1 into v_o from grille_sections where grille_id = v_grille;
    insert into grille_sections (grille_id, titre, ordre, condition_item_code, condition_valeur)
         values (v_grille, 'Suivi — diabète connu', v_o,
                 'situation_diabete', 'Diabète connu')
      returning id into v_sec;
    insert into grille_items (section_id, item_id, ordre)
    select v_sec, i.id, x.ord
      from (values ('motif_suivi_diabete',1), ('debut_diabete',2), ('traitement_en_cours',3),
                   ('hta',4), ('debut_hta',5), ('avc',6), ('date_avc',7),
                   ('dyslipidemie',8), ('traitement_dyslipidemie',9),
                   ('hyperuricemie',10), ('traitement_hyperuricemie',11)) as x(code, ord)
      join items i on i.code = x.code;
  end if;
end $$;

-- ---------------------------------------------------------------------
--  6. ANTÉCÉDENTS FAMILIAUX COMPLÉTÉS (interrogatoire général)
-- ---------------------------------------------------------------------
do $$
declare v_sec uuid; v_o int;
begin
  select gs.id into v_sec
    from grille_sections gs join grilles g on g.id = gs.grille_id
   where g.code = 'general' and gs.titre = 'Antécédents familiaux';
  if v_sec is null then return; end if;

  select coalesce(max(ordre), 0) into v_o from grille_items where section_id = v_sec;

  insert into grille_items (section_id, item_id, ordre)
  select v_sec, i.id, v_o + x.ord
    from (values ('atcd_fam_mort_subite',1), ('atcd_fam_avc_jeune',2)) as x(code, ord)
    join items i on i.code = x.code
  on conflict (section_id, item_id) do nothing;
end $$;

-- Le champ libre reste en dernière position
do $$
declare s record; v_item uuid; v_o int;
begin
  for s in select id from grille_sections loop
    select gi.item_id into v_item
      from grille_items gi join items i on i.id = gi.item_id
     where gi.section_id = s.id and i.categorie = 'autre' limit 1;
    if v_item is null then continue; end if;
    select coalesce(max(ordre), 0) + 1 into v_o from grille_items where section_id = s.id;
    update grille_items set ordre = v_o where section_id = s.id and item_id = v_item;
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  Vérification
-- ---------------------------------------------------------------------
select
  (select count(*) from bilan_examens where unite is not null)      as examens_avec_unite,
  (select count(*) from bilan_examens)                              as examens_total,
  (select count(*) from grille_sections where condition_item_code is not null)
                                                                    as rubriques_conditionnelles,
  (select count(*) from items)                                      as items;

-- ---------------------------------------------------------------------
--  7. MODÈLE DE COMPTE RENDU PAR DÉFAUT, PLUS COMPLET
--     Reprend tout ce que la consultation a produit : plaintes,
--     interrogatoire, constantes, résultats avec leurs unités, valeurs
--     calculées, examens prescrits, traitement.
-- ---------------------------------------------------------------------
update modeles_compte_rendu
   set corps = E'IDENTIFICATION\n{{patient.nom}} {{patient.prenom}} — dossier n° {{patient.code}}\n{{patient.sexe}}, {{patient.age}} ans (né(e) le {{patient.date_naissance}})\nAssurance : {{patient.organisme}} — {{patient.numero_secu}}\nConsultation du {{consultation.date}} — {{consultation.numero}}\n\nMOTIF DE CONSULTATION\n{{consultation.motifs}}\n{{consultation.motif}}\n\nPLAINTES\n{{consultation.plaintes}}\n\nANTÉCÉDENTS ET MODE DE VIE\n{{interrogatoire.antecedents}}\n\nHISTOIRE DE LA MALADIE ET SIGNES RECUEILLIS\n{{interrogatoire.histoire}}\n\nEXAMEN CLINIQUE\nConstantes : {{parametres.tous}}\n{{consultation.examen_clinique}}\n\nEXAMENS PARACLINIQUES\n{{consultation.examen_paraclinique}}\n\nRÉSULTATS DISPONIBLES\n{{examens.resultats}}\n\nVALEURS CALCULÉES\n{{calculs.tous}}\n\nDIAGNOSTIC RETENU\n{{consultation.diagnostic}}\n\nCONDUITE À TENIR\n{{consultation.conduite_a_tenir}}\n\nEXAMENS PRESCRITS\n{{examens.demandes}}\n\nTRAITEMENT PRESCRIT\n{{ordonnance.lignes}}'
 where par_defaut = true;
