-- =====================================================================
--  MedicAccess Gabon — Référentiel d'interrogatoire endocrinologique
--  Généré depuis les dix fichiers Word du médecin.
--  À exécuter dans le SQL Editor APRÈS schema.sql.
--
--  Contenu : catalogue d'items mutualisé, 9 grilles, bilans par motif,
--  aide à la saisie (abréviations, suggestions, diagnostics CIM-10).
-- =====================================================================

drop table if exists consultation_reponses cascade;
drop table if exists consultation_motifs cascade;
drop table if exists grille_items cascade;
drop table if exists grille_sections cascade;
drop table if exists grilles cascade;
drop table if exists items cascade;
drop table if exists bilan_examens cascade;
drop table if exists bilan_blocs cascade;
drop table if exists protocoles_lignes cascade;
drop table if exists protocoles cascade;
drop table if exists abreviations cascade;
drop table if exists suggestions cascade;

-- ---------------------------------------------------------------- catalogue
create table items (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  libelle    text not null,
  type       text not null default 'booleen'
               check (type in ('booleen','nombre','date','choix','texte')),
  unite      text,
  options    jsonb,
  libelle_negatif text,          -- tournure négative si la négation auto est fautive
  categorie  text default 'signe',
  created_at timestamptz default now()
);

create table grilles (
  id      uuid primary key default gen_random_uuid(),
  code    text unique not null,
  nom     text not null,
  icone   text,
  ordre   int default 0,
  defaut  boolean default false,  -- pré-sélectionnée à l’ouverture
  actif   boolean default true
);

create table grille_sections (
  id        uuid primary key default gen_random_uuid(),
  grille_id uuid not null references grilles(id) on delete cascade,
  titre     text not null,
  sexe      text,                 -- restreint l’affichage : Masculin / Féminin / null
  ordre     int default 0,
  a_valider boolean default false -- rubrique proposée, absente du document source
);

create table grille_items (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references grille_sections(id) on delete cascade,
  item_id    uuid not null references items(id) on delete cascade,
  ordre      int default 0,
  unique (section_id, item_id)
);

-- ------------------------------------------------------- motifs & réponses
create table consultation_motifs (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  grille_id       uuid not null references grilles(id) on delete cascade,
  unique (consultation_id, grille_id)
);

-- Une réponse par (consultation, item) : c'est CETTE contrainte qui réalise
-- la mutualisation. Un signe partagé par deux motifs n'est stocké — donc
-- demandé — qu'une seule fois.
create table consultation_reponses (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  item_id         uuid not null references items(id) on delete cascade,
  etat            text check (etat in ('presente','absente','non_explore')),
  valeur          text,
  remarque        text,
  updated_at      timestamptz default now(),
  unique (consultation_id, item_id)
);
create index idx_reponses_consultation on consultation_reponses (consultation_id);

-- ------------------------------------------------------------------ bilans
create table bilan_blocs (
  id        uuid primary key default gen_random_uuid(),
  grille_id uuid references grilles(id) on delete cascade,
  titre     text not null,
  ordre     int default 0,
  a_valider boolean default false   -- proposition absente du document source
);

create table bilan_examens (
  id            uuid primary key default gen_random_uuid(),
  bloc_id       uuid not null references bilan_blocs(id) on delete cascade,
  libelle       text not null,
  code          text,
  type          text default 'Laboratoire',
  conditionnel  boolean default false,
  condition     text,
  ordre         int default 0
);

-- ------------------------------------------------- protocoles de prescription
-- Volontairement livrés VIDES : le contenu thérapeutique relève du médecin.
create table protocoles (
  id         uuid primary key default gen_random_uuid(),
  grille_id  uuid references grilles(id) on delete set null,
  medecin_id uuid references medecins(id) on delete cascade,
  nom        text not null,
  indication text,
  partage    boolean default false,
  actif      boolean default true,
  created_at timestamptz default now()
);

create table protocoles_lignes (
  id            uuid primary key default gen_random_uuid(),
  protocole_id  uuid not null references protocoles(id) on delete cascade,
  medicament    text not null,
  dosage        text,
  forme         text,
  posologie     text,
  duree         text,
  quantite      text,
  instructions  text,
  ordre         int default 0
);

-- -------------------------------------------------------- aide à la saisie
create table abreviations (
  id         uuid primary key default gen_random_uuid(),
  medecin_id uuid references medecins(id) on delete cascade,
  raccourci  text not null,
  texte      text not null,
  actif      boolean default true
);

-- Alimentée par l'usage : chaque valeur saisie incrémente sa fréquence,
-- l'autocomplétion propose d'abord ce que le médecin écrit le plus souvent.
create table suggestions (
  id         uuid primary key default gen_random_uuid(),
  domaine    text not null,   -- quartier, profession, motif, diagnostic,
                              -- medicament, examen, allergie...
  valeur     text not null,
  code       text,            -- CIM-10 pour les diagnostics
  frequence  int default 0,
  unique (domaine, valeur)
);
create index idx_suggestions_domaine on suggestions (domaine, frequence desc);


alter table items                disable row level security;
alter table grilles              disable row level security;
alter table grille_sections      disable row level security;
alter table grille_items         disable row level security;
alter table consultation_motifs  disable row level security;
alter table consultation_reponses disable row level security;
alter table bilan_blocs          disable row level security;
alter table bilan_examens        disable row level security;
alter table protocoles           disable row level security;
alter table protocoles_lignes    disable row level security;
alter table abreviations         disable row level security;
alter table suggestions          disable row level security;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Constantes manquantes pour l'obésité et la croissance
insert into parametres_types (libelle, unite, ordre, calcule) values
  ('Tour de taille',   'cm', 11, false),
  ('Tour de hanche',   'cm', 12, false),
  ('Tour de cou',      'cm', 13, false)
on conflict (libelle) do nothing;


-- ------------------------------------------------------- catalogue d'items
insert into items (code, libelle, type, unite, options, libelle_negatif, categorie) values
  ('asthenie', 'Asthénie', 'booleen', null, null, null, 'signe'),
  ('amaigrissement', 'Amaigrissement', 'booleen', null, null, null, 'signe'),
  ('amaigrissement_appetit_conserve', 'Amaigrissement malgré un bon appétit', 'booleen', null, null, 'pas d''amaigrissement malgré un appétit conservé', 'signe'),
  ('prise_de_poids', 'Prise de poids', 'booleen', null, null, null, 'signe'),
  ('cephalees', 'Céphalées', 'booleen', null, null, null, 'signe'),
  ('sueurs', 'Sueurs', 'booleen', null, null, null, 'signe'),
  ('palpitations', 'Palpitations', 'booleen', null, null, null, 'signe'),
  ('tremblements', 'Tremblements', 'booleen', null, null, null, 'signe'),
  ('faiblesse_musculaire', 'Faiblesse musculaire', 'booleen', null, null, null, 'signe'),
  ('crampes', 'Crampes', 'booleen', null, null, null, 'signe'),
  ('nausees', 'Nausées', 'booleen', null, null, null, 'signe'),
  ('vomissements', 'Vomissements', 'booleen', null, null, null, 'signe'),
  ('constipation', 'Constipation', 'booleen', null, null, null, 'signe'),
  ('diarrhee', 'Diarrhée', 'booleen', null, null, null, 'signe'),
  ('oedemes', 'Œdèmes', 'booleen', null, null, null, 'signe'),
  ('fractures', 'Fractures', 'booleen', null, null, null, 'signe'),
  ('depression', 'Dépression', 'booleen', null, null, null, 'signe'),
  ('anxiete', 'Anxiété', 'booleen', null, null, null, 'signe'),
  ('stress', 'Stress', 'booleen', null, null, null, 'signe'),
  ('troubles_cognitifs', 'Troubles cognitifs', 'booleen', null, null, null, 'signe'),
  ('troubles_psychiatriques', 'Troubles psychiatriques', 'booleen', null, null, null, 'signe'),
  ('hta', 'Hypertension artérielle', 'booleen', null, null, null, 'signe'),
  ('hypotension', 'Hypotension', 'booleen', null, null, null, 'signe'),
  ('diabete_associe', 'Diabète', 'booleen', null, null, null, 'signe'),
  ('infections_repetees', 'Infections répétées', 'booleen', null, null, null, 'signe'),
  ('goitre', 'Goitre', 'booleen', null, null, null, 'signe'),
  ('nodule_thyroidien', 'Nodule thyroïdien', 'booleen', null, null, null, 'signe'),
  ('motif_hyperthyroidie', 'Hyperthyroïdie', 'booleen', null, null, null, 'motif'),
  ('motif_hypothyroidie', 'Hypothyroïdie', 'booleen', null, null, null, 'motif'),
  ('cervicalgie', 'Cervicalgie', 'booleen', null, null, null, 'signe'),
  ('surveillance_post_thyroidectomie', 'Surveillance post-thyroïdectomie', 'booleen', null, null, null, 'motif'),
  ('bilan_anomalie_biologique', 'Bilan d''anomalie biologique', 'booleen', null, null, null, 'motif'),
  ('date_debut', 'Date de début', 'date', null, null, null, 'anamnese'),
  ('mode_installation', 'Mode d''installation', 'choix', null, '["Brutal", "Progressif"]'::jsonb, null, 'anamnese'),
  ('evolution', 'Évolution', 'choix', null, '["Stable", "Aggravation", "Amélioration", "Fluctuante"]'::jsonb, null, 'anamnese'),
  ('facteurs_modifiants', 'Facteurs aggravants ou soulageants', 'texte', null, null, null, 'anamnese'),
  ('traitements_deja_recus', 'Traitements déjà reçus', 'texte', null, null, null, 'anamnese'),
  ('radiotherapie_cervicale', 'Radiothérapie cervicale', 'booleen', null, null, null, 'antecedent'),
  ('chirurgie_thyroidienne', 'Chirurgie thyroïdienne', 'booleen', null, null, null, 'antecedent'),
  ('iode_radioactif', 'Iode radioactif', 'booleen', null, null, null, 'antecedent'),
  ('thyroidite', 'Thyroïdite', 'booleen', null, null, null, 'antecedent'),
  ('atcd_familiaux_texte', 'Antécédents familiaux', 'texte', null, null, null, 'antecedent'),
  ('nervosite', 'Nervosité', 'booleen', null, null, null, 'signe'),
  ('irritabilite', 'Irritabilité', 'booleen', null, null, null, 'signe'),
  ('intolerance_chaleur', 'Intolérance à la chaleur', 'booleen', null, null, null, 'signe'),
  ('intolerance_froid', 'Intolérance au froid', 'booleen', null, null, null, 'signe'),
  ('frilosite', 'Frilosité', 'booleen', null, null, null, 'signe'),
  ('dyspnee', 'Dyspnée', 'booleen', null, null, null, 'signe'),
  ('troubles_du_sommeil', 'Troubles du sommeil', 'booleen', null, null, null, 'signe'),
  ('ralentissement_intellectuel', 'Ralentissement intellectuel', 'booleen', null, null, null, 'signe'),
  ('somnolence', 'Somnolence', 'booleen', null, null, null, 'signe'),
  ('troubles_memoire', 'Troubles de la mémoire', 'booleen', null, null, null, 'signe'),
  ('voix_rauque', 'Voix rauque', 'booleen', null, null, null, 'signe'),
  ('chute_cheveux', 'Chute des cheveux', 'booleen', null, null, null, 'signe'),
  ('dysphagie', 'Dysphagie', 'booleen', null, null, null, 'signe'),
  ('dysphonie', 'Dysphonie', 'booleen', null, null, null, 'signe'),
  ('sensation_etranglement', 'Sensation d''étranglement', 'booleen', null, null, null, 'signe'),
  ('exophtalmie', 'Exophtalmie', 'booleen', null, null, null, 'signe'),
  ('diplopie', 'Diplopie', 'booleen', null, null, null, 'signe'),
  ('larmoiement', 'Larmoiement', 'booleen', null, null, null, 'signe'),
  ('photophobie', 'Photophobie', 'booleen', null, null, null, 'signe'),
  ('douleur_oculaire', 'Douleur oculaire', 'booleen', null, null, null, 'signe'),
  ('troubles_visuels', 'Troubles visuels', 'booleen', null, null, null, 'signe'),
  ('baisse_vision', 'Baisse de vision', 'booleen', null, null, null, 'signe'),
  ('galactorrhee', 'Galactorrhée', 'booleen', null, null, null, 'signe'),
  ('amenorrhee', 'Aménorrhée', 'booleen', null, null, null, 'signe'),
  ('infertilite', 'Infertilité', 'booleen', null, null, null, 'signe'),
  ('libido_diminuee', 'Baisse de la libido', 'booleen', null, null, null, 'signe'),
  ('dysfonction_erectile', 'Dysfonction érectile', 'booleen', null, null, null, 'signe'),
  ('gynecomastie', 'Gynécomastie', 'booleen', null, null, null, 'signe'),
  ('augmentation_pointure', 'Augmentation de la pointure', 'booleen', null, null, null, 'signe'),
  ('augmentation_taille_bague', 'Augmentation de la taille de bague', 'booleen', null, null, null, 'signe'),
  ('modification_visage', 'Modification des traits du visage', 'booleen', null, null, null, 'signe'),
  ('ronflement', 'Ronflement', 'booleen', null, null, null, 'signe'),
  ('apnees_sommeil', 'Syndrome d''apnées du sommeil', 'booleen', null, null, null, 'signe'),
  ('arthralgies', 'Arthralgies', 'booleen', null, null, null, 'signe'),
  ('canal_carpien', 'Syndrome du canal carpien', 'booleen', null, null, null, 'signe'),
  ('vergetures', 'Vergetures', 'booleen', null, null, null, 'signe'),
  ('ecchymoses', 'Ecchymoses', 'booleen', null, null, null, 'signe'),
  ('polyurie', 'Polyurie', 'booleen', null, null, null, 'signe'),
  ('polydipsie', 'Polydipsie', 'booleen', null, null, null, 'signe'),
  ('soif', 'Soif', 'booleen', null, null, null, 'signe'),
  ('nycturie', 'Nycturie', 'booleen', null, null, null, 'signe'),
  ('vision_floue', 'Vision floue', 'booleen', null, null, null, 'signe'),
  ('polyphagie', 'Polyphagie', 'booleen', null, null, null, 'signe'),
  ('hyperglycemie_fortuite', 'Hyperglycémie fortuite', 'booleen', null, null, null, 'circonstance'),
  ('grossesse_en_cours', 'Grossesse', 'booleen', null, null, null, 'circonstance'),
  ('infection_revelatrice', 'Infection', 'booleen', null, null, null, 'circonstance'),
  ('depistage', 'Dépistage', 'booleen', null, null, null, 'circonstance'),
  ('fourmillements', 'Fourmillements', 'booleen', null, null, null, 'signe'),
  ('brulures_neuropathiques', 'Brûlures', 'booleen', null, null, null, 'signe'),
  ('douleurs_nocturnes', 'Douleurs nocturnes', 'booleen', null, null, null, 'signe'),
  ('claudication', 'Claudication intermittente', 'booleen', null, null, null, 'signe'),
  ('pied_froid', 'Pied froid', 'booleen', null, null, null, 'signe'),
  ('mousse_urines', 'Mousse dans les urines', 'booleen', null, null, null, 'signe'),
  ('plaies', 'Plaies', 'booleen', null, null, null, 'signe'),
  ('ulceres', 'Ulcères', 'booleen', null, null, null, 'signe'),
  ('amputation', 'Amputation', 'booleen', null, null, null, 'antecedent'),
  ('chaussures_inadaptees', 'Chaussures inadaptées', 'booleen', null, null, null, 'signe'),
  ('dyslipidemie', 'Dyslipidémie', 'booleen', null, null, null, 'antecedent'),
  ('tabagisme', 'Tabagisme', 'booleen', null, null, null, 'habitude'),
  ('sedentarite', 'Sédentarité', 'booleen', null, null, null, 'habitude'),
  ('atcd_fam_hypercholesterolemie', 'Antécédents familiaux d''hypercholestérolémie', 'booleen', null, null, null, 'antecedent'),
  ('infarctus_precoce', 'Infarctus précoce', 'booleen', null, null, null, 'antecedent'),
  ('avc', 'AVC', 'booleen', null, null, null, 'antecedent'),
  ('xanthomes', 'Xanthomes', 'booleen', null, null, null, 'signe'),
  ('alimentation_desc', 'Alimentation', 'texte', null, null, null, 'habitude'),
  ('activite_physique_desc', 'Activité physique', 'choix', null, '["Sédentaire", "Légère", "Modérée", "Intense"]'::jsonb, null, 'habitude'),
  ('traitements_hypolipemiants', 'Traitements hypolipémiants', 'texte', null, null, null, 'anamnese'),
  ('melanodermie', 'Mélanodermie', 'booleen', null, null, null, 'signe'),
  ('envie_de_sel', 'Envie de sel', 'booleen', null, null, null, 'signe'),
  ('syncopes', 'Syncopes', 'booleen', null, null, null, 'signe'),
  ('obesite_facio_tronculaire', 'Obésité facio-tronculaire', 'booleen', null, null, null, 'signe'),
  ('crises_hypertensives', 'Crises hypertensives', 'booleen', null, null, null, 'signe'),
  ('douleurs_osseuses', 'Douleurs osseuses', 'booleen', null, null, null, 'signe'),
  ('perte_de_taille', 'Perte de taille', 'booleen', null, null, null, 'signe'),
  ('coliques_nephretiques', 'Coliques néphrétiques', 'booleen', null, null, null, 'signe'),
  ('calculs_urinaires', 'Calculs urinaires', 'booleen', null, null, null, 'signe'),
  ('pancreatite', 'Pancréatite', 'booleen', null, null, null, 'antecedent'),
  ('paresthesies_peribuccales', 'Paresthésies péribuccales', 'booleen', null, null, null, 'signe'),
  ('paresthesies_extremites', 'Paresthésies des extrémités', 'booleen', null, null, null, 'signe'),
  ('tetanie', 'Tétanie', 'booleen', null, null, null, 'signe'),
  ('signe_chvostek', 'Signe de Chvostek', 'booleen', null, null, null, 'signe'),
  ('signe_trousseau', 'Signe de Trousseau', 'booleen', null, null, null, 'signe'),
  ('laryngospasme', 'Laryngospasme', 'booleen', null, null, null, 'signe'),
  ('convulsions', 'Convulsions', 'booleen', null, null, null, 'signe'),
  ('cataracte', 'Cataracte', 'booleen', null, null, null, 'signe'),
  ('troubles_humeur', 'Troubles de l''humeur', 'booleen', null, null, null, 'signe'),
  ('age_premieres_regles', 'Âge des premières règles', 'nombre', 'ans', null, null, 'anamnese'),
  ('regularite_cycles', 'Régularité des cycles', 'choix', null, '["Réguliers", "Irréguliers", "Aménorrhée", "Ménopausée"]'::jsonb, null, 'anamnese'),
  ('date_dernieres_regles', 'Date des dernières règles', 'date', null, null, null, 'anamnese'),
  ('menopause_age', 'Ménopause (âge)', 'nombre', 'ans', null, null, 'anamnese'),
  ('nb_grossesses', 'Grossesses', 'nombre', null, null, null, 'anamnese'),
  ('nb_fausses_couches', 'Fausses couches', 'nombre', null, null, null, 'anamnese'),
  ('oligomenorrhee', 'Oligoménorrhée', 'booleen', null, null, null, 'signe'),
  ('menometrorragies', 'Ménométrorragies', 'booleen', null, null, null, 'signe'),
  ('hirsutisme', 'Hirsutisme', 'booleen', null, null, null, 'signe'),
  ('acne', 'Acné', 'booleen', null, null, null, 'signe'),
  ('alopecie', 'Alopécie', 'booleen', null, null, null, 'signe'),
  ('bouffees_de_chaleur', 'Bouffées de chaleur', 'booleen', null, null, null, 'signe'),
  ('diminution_pilosite', 'Diminution de la pilosité', 'booleen', null, null, null, 'signe'),
  ('diminution_volume_testiculaire', 'Diminution du volume testiculaire', 'booleen', null, null, null, 'signe'),
  ('poids_naissance', 'Poids de naissance', 'nombre', 'kg', null, null, 'mesure'),
  ('poids_maximal', 'Poids maximal atteint', 'nombre', 'kg', null, null, 'mesure'),
  ('poids_minimal', 'Poids minimal', 'nombre', 'kg', null, null, 'mesure'),
  ('debut_obesite', 'Début de l''obésité', 'choix', null, '["Enfance", "Adolescence", "Adulte jeune", "Après 40 ans", "Post-partum", "Après un traitement"]'::jsonb, null, 'anamnese'),
  ('vitesse_prise_poids', 'Vitesse de prise de poids', 'choix', null, '["Lente", "Progressive", "Rapide"]'::jsonb, null, 'anamnese'),
  ('tentatives_amaigrissement', 'Tentatives d''amaigrissement', 'texte', null, null, null, 'anamnese'),
  ('nombre_repas', 'Nombre de repas par jour', 'nombre', null, null, null, 'habitude'),
  ('grignotage', 'Grignotage', 'booleen', null, null, null, 'habitude'),
  ('boissons_sucrees', 'Boissons sucrées', 'booleen', null, null, null, 'habitude'),
  ('fast_food', 'Fast-food', 'booleen', null, null, null, 'habitude'),
  ('alcool', 'Alcool', 'choix', null, '["Non", "Occasionnel", "Régulier", "Sevré"]'::jsonb, null, 'habitude'),
  ('compulsions_alimentaires', 'Compulsions alimentaires', 'booleen', null, null, null, 'habitude'),
  ('alimentation_nocturne', 'Alimentation nocturne', 'booleen', null, null, null, 'habitude'),
  ('profession_desc', 'Profession', 'texte', null, null, null, 'habitude'),
  ('sport', 'Sport pratiqué', 'texte', null, null, null, 'habitude'),
  ('temps_assis', 'Temps assis par jour', 'nombre', 'h', null, null, 'habitude'),
  ('somnolence_diurne', 'Somnolence diurne', 'booleen', null, null, null, 'signe'),
  ('taille_naissance', 'Taille de naissance', 'nombre', 'cm', null, null, 'mesure'),
  ('courbe_croissance', 'Allure de la courbe de croissance', 'choix', null, '["Régulière", "Cassure", "Ralentissement", "Accélération"]'::jsonb, null, 'mesure'),
  ('puberte_debutee', 'Puberté débutée', 'booleen', null, null, null, 'anamnese'),
  ('maladies_chroniques', 'Maladies chroniques', 'texte', null, null, null, 'antecedent'),
  ('age_apparition_puberte', 'Âge d''apparition des signes pubertaires', 'nombre', 'ans', null, null, 'anamnese'),
  ('croissance_rapide', 'Croissance rapide', 'booleen', null, null, null, 'signe'),
  ('developpement_mammaire', 'Développement mammaire', 'booleen', null, null, null, 'signe'),
  ('pilosite_pubienne', 'Pilosité pubienne', 'booleen', null, null, null, 'signe'),
  ('regles_apparues', 'Règles apparues', 'booleen', null, null, null, 'signe'),
  ('absence_developpement_sexuel', 'Absence de développement sexuel', 'booleen', null, null, null, 'signe'),
  ('atcd_medicaux', 'Antécédents médicaux', 'texte', null, null, null, 'antecedent'),
  ('atcd_chirurgicaux', 'Antécédents chirurgicaux', 'texte', null, null, null, 'antecedent'),
  ('gesta', 'G (gestité)', 'nombre', null, null, null, 'antecedent'),
  ('para', 'P (parité)', 'nombre', null, null, null, 'antecedent'),
  ('avortements', 'Av (avortements)', 'nombre', null, null, null, 'antecedent'),
  ('enfants_vivants', 'Ev (enfants vivants)', 'nombre', null, null, null, 'antecedent'),
  ('medicaments_en_cours', 'Médicaments en cours', 'texte', null, null, null, 'antecedent'),
  ('allergies', 'Allergies', 'texte', null, null, null, 'antecedent'),
  ('atcd_fam_diabete', 'Diabète', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_thyroide', 'Maladies thyroïdiennes', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_cancer_endocrinien', 'Cancer endocrinien', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_hta', 'HTA', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_dyslipidemie', 'Dyslipidémie', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_obesite', 'Obésité', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_osteoporose', 'Ostéoporose', 'booleen', null, null, null, 'antecedent'),
  ('atcd_fam_nem', 'NEM (néoplasie endocrinienne multiple)', 'booleen', null, null, null, 'antecedent'),
  ('tabac', 'Tabac', 'choix', null, '["Non fumeur", "Fumeur actif", "Ancien fumeur"]'::jsonb, null, 'habitude'),
  ('drogues', 'Drogues', 'booleen', null, null, null, 'habitude'),
  ('regime_alimentaire', 'Régime alimentaire', 'texte', null, null, null, 'habitude'),
  ('sommeil_desc', 'Sommeil', 'choix', null, '["Normal", "Insomnie", "Hypersomnie", "Fragmenté"]'::jsonb, null, 'habitude'),
  ('apnees', 'Apnées constatées', 'booleen', null, null, null, 'signe');

-- ---------------------------------------------------------------- grilles
insert into grilles (code, nom, icone, ordre, defaut) values
  ('general', 'Interrogatoire général', 'clipboard-text', 1, true),
  ('thyroide', 'Thyroïde', 'shield', 2, false),
  ('hypophyse', 'Hypophyse', 'brain', 3, false),
  ('diabete', 'Diabète et lipides', 'droplet', 4, false),
  ('surrenales', 'Surrénales', 'flame', 5, false),
  ('parathyroides', 'Parathyroïdes', 'bone', 6, false),
  ('gonades', 'Gonades', 'venus', 7, false),
  ('obesite', 'Obésité et métabolisme', 'scale', 8, false),
  ('croissance', 'Croissance et puberté', 'ruler-measure', 9, false);

-- ------------------------------------------------------ sections & items
do $$
declare v_grille uuid; v_section uuid;
begin
  select id into v_grille from grilles where code = 'general';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Antécédents personnels', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'atcd_medicaux';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'atcd_chirurgicaux';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'gesta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'para';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'avortements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'enfants_vivants';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'medicaments_en_cours';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'allergies';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Antécédents familiaux', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'atcd_fam_diabete';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'atcd_fam_thyroide';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'atcd_fam_cancer_endocrinien';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'atcd_fam_hta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'atcd_fam_dyslipidemie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'atcd_fam_obesite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'atcd_fam_osteoporose';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'atcd_fam_nem';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Mode de vie', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'tabac';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'alcool';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'drogues';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'activite_physique_desc';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'regime_alimentaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'sommeil_desc';
  select id into v_grille from grilles where code = 'thyroide';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Motif de consultation', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'goitre';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'nodule_thyroidien';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'motif_hyperthyroidie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'motif_hypothyroidie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'cervicalgie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'surveillance_post_thyroidectomie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'bilan_anomalie_biologique';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Histoire de la maladie', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'date_debut';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'mode_installation';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'evolution';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'facteurs_modifiants';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'traitements_deja_recus';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Antécédents', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'radiotherapie_cervicale';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'chirurgie_thyroidienne';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'iode_radioactif';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'thyroidite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'atcd_familiaux_texte';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Signes d’hyperthyroïdie', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'amaigrissement_appetit_conserve';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'palpitations';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'nervosite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'tremblements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'intolerance_chaleur';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'sueurs';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'diarrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'faiblesse_musculaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 9 from items where code = 'dyspnee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 10 from items where code = 'troubles_du_sommeil';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 11 from items where code = 'irritabilite';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Signes d’hypothyroïdie', null, 5, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'asthenie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'frilosite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'constipation';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'prise_de_poids';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'ralentissement_intellectuel';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'somnolence';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'troubles_memoire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'voix_rauque';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 9 from items where code = 'chute_cheveux';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 10 from items where code = 'crampes';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 11 from items where code = 'oedemes';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Signes compressifs', null, 6, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'dysphagie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'dyspnee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'dysphonie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'sensation_etranglement';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Signes ophtalmologiques', null, 7, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'exophtalmie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'diplopie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'larmoiement';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'photophobie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'douleur_oculaire';
  select id into v_grille from grilles where code = 'hypophyse';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Syndrome tumoral', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'cephalees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'troubles_visuels';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'diplopie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'baisse_vision';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Hyperprolactinémie — femme', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'galactorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'amenorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'infertilite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'libido_diminuee';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Hyperprolactinémie — homme', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'libido_diminuee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'dysfonction_erectile';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'gynecomastie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'infertilite';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Acromégalie', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'augmentation_pointure';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'augmentation_taille_bague';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'modification_visage';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'cephalees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'sueurs';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'ronflement';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'apnees_sommeil';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'arthralgies';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 9 from items where code = 'canal_carpien';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Maladie de Cushing', null, 5, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'prise_de_poids';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'faiblesse_musculaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'ecchymoses';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'vergetures';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'hta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'diabete_associe';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'fractures';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'troubles_psychiatriques';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Insuffisance hypophysaire', null, 6, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'asthenie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'hypotension';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'amenorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'libido_diminuee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'infertilite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'intolerance_froid';
  select id into v_grille from grilles where code = 'diabete';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Circonstances de découverte', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'polyurie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'polydipsie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'amaigrissement';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'hyperglycemie_fortuite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'grossesse_en_cours';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'infection_revelatrice';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'depistage';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Symptômes', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'soif';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'polyurie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'nycturie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'asthenie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'vision_floue';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'polyphagie';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Complications neurologiques', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'fourmillements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'brulures_neuropathiques';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'douleurs_nocturnes';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Complications vasculaires', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'claudication';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'pied_froid';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Complications ophtalmologiques', null, 5, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'vision_floue';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'baisse_vision';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Complications rénales', null, 6, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'mousse_urines';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'oedemes';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Pied diabétique', null, 7, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'plaies';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'ulceres';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'amputation';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'chaussures_inadaptees';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Facteurs de risque', null, 8, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'hta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'dyslipidemie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'tabagisme';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'sedentarite';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Métabolisme lipidique', null, 9, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'atcd_fam_hypercholesterolemie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'infarctus_precoce';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'avc';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'xanthomes';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'alimentation_desc';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'activite_physique_desc';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'traitements_hypolipemiants';
  select id into v_grille from grilles where code = 'surrenales';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Insuffisance surrénalienne', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'asthenie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'amaigrissement';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'hypotension';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'melanodermie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'nausees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'vomissements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'envie_de_sel';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'syncopes';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Syndrome de Cushing', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'obesite_facio_tronculaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'vergetures';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'hta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'diabete_associe';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'faiblesse_musculaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'ecchymoses';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'infections_repetees';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Hyperaldostéronisme primaire', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'hta';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'crampes';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'faiblesse_musculaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'polyurie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'polydipsie';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Phéochromocytome', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'cephalees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'sueurs';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'palpitations';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'crises_hypertensives';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'tremblements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'amaigrissement';
  select id into v_grille from grilles where code = 'parathyroides';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Os', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'douleurs_osseuses';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'fractures';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'perte_de_taille';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Reins', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'coliques_nephretiques';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'calculs_urinaires';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'polyurie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'polydipsie';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Digestif', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'constipation';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'nausees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'vomissements';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'pancreatite';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Neuropsychique', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'asthenie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'depression';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'troubles_cognitifs';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Hypoparathyroïdie', null, 5, true) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'paresthesies_peribuccales';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'paresthesies_extremites';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'crampes';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'tetanie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'signe_chvostek';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'signe_trousseau';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'laryngospasme';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'convulsions';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 9 from items where code = 'cataracte';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 10 from items where code = 'troubles_humeur';
  select id into v_grille from grilles where code = 'gonades';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Histoire gynécologique', 'Féminin', 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'age_premieres_regles';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'regularite_cycles';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'date_dernieres_regles';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'menopause_age';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'nb_grossesses';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'nb_fausses_couches';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Symptômes — femme', 'Féminin', 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'amenorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'oligomenorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'menometrorragies';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'galactorrhee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'infertilite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'hirsutisme';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'acne';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 8 from items where code = 'alopecie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 9 from items where code = 'bouffees_de_chaleur';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Symptômes — homme', 'Masculin', 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'libido_diminuee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'dysfonction_erectile';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'infertilite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'diminution_pilosite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'gynecomastie';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'diminution_volume_testiculaire';
  select id into v_grille from grilles where code = 'obesite';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Histoire pondérale', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'poids_naissance';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'poids_maximal';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'poids_minimal';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'debut_obesite';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'vitesse_prise_poids';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'tentatives_amaigrissement';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Alimentation', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'nombre_repas';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'grignotage';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'boissons_sucrees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'fast_food';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'alcool';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'compulsions_alimentaires';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 7 from items where code = 'alimentation_nocturne';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Activité physique', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'profession_desc';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'sport';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'temps_assis';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Sommeil', null, 4, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'ronflement';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'apnees';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'somnolence_diurne';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Psychologique', null, 5, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'stress';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'depression';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'anxiete';
  select id into v_grille from grilles where code = 'croissance';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Croissance', null, 1, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'taille_naissance';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'poids_naissance';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'courbe_croissance';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'puberte_debutee';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'atcd_familiaux_texte';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 6 from items where code = 'maladies_chroniques';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Puberté précoce', null, 2, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'age_apparition_puberte';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'croissance_rapide';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'developpement_mammaire';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 4 from items where code = 'pilosite_pubienne';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 5 from items where code = 'regles_apparues';
  insert into grille_sections (grille_id, titre, sexe, ordre, a_valider)
    values (v_grille, 'Retard pubertaire', null, 3, false) returning id into v_section;
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 1 from items where code = 'absence_developpement_sexuel';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 2 from items where code = 'atcd_familiaux_texte';
  insert into grille_items (section_id, item_id, ordre)
    select v_section, id, 3 from items where code = 'maladies_chroniques';
end $$;

-- ----------------------------------------------------------------- bilans
do $$
declare v_grille uuid; v_bloc uuid;
begin
  select id into v_grille from grilles where code = 'thyroide';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Biologie', 1, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TSH ultrasensible', 'TSHUS', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FT4', 'FT4', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FT3', 'FT3', 'Laboratoire', true, 'si FT4 normale et suspicion de T3-thyrotoxicose', 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TRAb', 'TRAB', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Anti-TPO', 'ATPO', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Anti-thyroglobuline', 'ATG', 'Laboratoire', false, null, 6);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Imagerie', 2, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Échographie thyroïdienne avec Doppler', 'ECHOTHY', 'Imagerie', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Scintigraphie thyroïdienne', 'SCINTITHY', 'Imagerie', true, 'si TSH basse et étiologie incertaine', 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'IRM ou scanner cervico-thoracique', 'IRMCERV', 'Imagerie', true, 'en cas de goitre plongeant ou de compression', 3);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Retentissement cardiaque', 3, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'ECG', 'ECG', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Holter ECG', 'HOLTER', 'Laboratoire', true, 'si palpitations', 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Échocardiographie Doppler', 'ECHOCARD', 'Laboratoire', true, 'si insuffisance cardiaque', 3);
  select id into v_grille from grilles where code = 'hypophyse';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Axe hypophysaire', 1, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'IGF-1', 'IGF1', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'GH', 'GH', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Prolactine', 'PRL', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'ACTH', 'ACTH', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cortisol', 'CORT', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FSH', 'FSH', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'LH', 'LH', 'Laboratoire', false, null, 7);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Œstradiol', 'E2', 'Laboratoire', false, null, 8);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Testostérone', 'TESTO', 'Laboratoire', false, null, 9);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TSH', 'TSH', 'Laboratoire', false, null, 10);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FT4', 'FT4', 'Laboratoire', false, null, 11);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FT3', 'FT3', 'Laboratoire', false, null, 12);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Imagerie et retentissement', 2, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'IRM hypophysaire avec gadolinium', 'IRMHYP', 'Imagerie', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Champ visuel', 'CV', 'Laboratoire', false, null, 2);
  select id into v_grille from grilles where code = 'diabete';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Équilibre glycémique', 1, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Glycémie à jeun', 'GAJ', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'HbA1c', 'HBA1C', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Glycémie post-prandiale', 'GPP', 'Laboratoire', true, 'si nécessaire', 3);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Retentissement rénal', 2, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Bandelette urinaire', 'BU', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'ECBU', 'ECBU', 'Laboratoire', true, 'si infection suspectée', 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Créatinine', 'CREAT', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'DFG estimé', 'DFG', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Rapport albumine/créatinine urinaire', 'RACU', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Urée', 'UREE', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Ionogramme sanguin', 'IONO', 'Laboratoire', false, null, 7);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Acide urique', 'URIC', 'Laboratoire', false, null, 8);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Albuminémie', 'ALB', 'Laboratoire', false, null, 9);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Bilan cardiovasculaire', 3, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cholestérol total', 'CHOLT', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'HDL cholestérol', 'HDL', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'LDL cholestérol', 'LDL', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Triglycérides', 'TG', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'ECG', 'ECG', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Échographie Doppler cardiaque', 'ECHOCARD', 'Imagerie', true, 'si signe d''appel cardiaque', 6);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Bilan général', 4, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'NFS', 'NFS', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'CRP', 'CRP', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Transaminases', 'TRANSA', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Calcémie', 'CA', 'Laboratoire', false, null, 4);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Dépistage des complications', 5, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Fond d''œil', 'FO', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Test au monofilament de 10 g', 'MONOFIL', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Diapason de 128 Hz', 'DIAPASON', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'IPS (index de pression systolique)', 'IPS', 'Laboratoire', true, 'si suspicion d''artériopathie', 4);
  select id into v_grille from grilles where code = 'surrenales';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Exploration du cortisol', 1, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cortisolémie de 8 h', 'CORT8', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cortisolurie des 24 h', 'CORTU24', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cortisol salivaire', 'CORTSAL', 'Laboratoire', false, null, 3);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Bloc enzymatique', 2, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, '21-hydroxylase', 'OH21', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, '11β-hydroxylase', 'OH11B', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, '17α-hydroxylase', 'OH17A', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, '3β-HSD', 'HSD3B', 'Laboratoire', false, null, 4);
  select id into v_grille from grilles where code = 'croissance';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Évaluation auxologique', 1, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Courbe staturale complète', 'COURBEST', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Vitesse de croissance', 'VITCROISS', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Taille cible génétique', 'TAILLECIBLE', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Poids et évolution pondérale', 'EVOLPOND', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Taille et poids de naissance', 'MESNAISS', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Examen des proportions corporelles', 'PROPORTIONS', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Stade pubertaire de Tanner', 'TANNER', 'Laboratoire', false, null, 7);
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Examens complémentaires', 2, false) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Âge osseux', 'AGEOSSEUX', 'Imagerie', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TSH + FT4', 'TSHFT4', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'IGF-1', 'IGF1', 'Laboratoire', false, null, 3);
  select id into v_grille from grilles where code = 'parathyroides';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Proposition à valider', 1, true) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Calcémie totale', 'CA', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Calcium ionisé', 'CAION', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Phosphorémie', 'PHOS', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'PTH', 'PTH', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, '25-OH vitamine D', 'VITD', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Albuminémie', 'ALB', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Créatinine', 'CREAT', 'Laboratoire', false, null, 7);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Calciurie des 24 h', 'CAU24', 'Laboratoire', false, null, 8);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Échographie cervicale', 'ECHOCERV', 'Imagerie', false, null, 9);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Ostéodensitométrie', 'DMO', 'Imagerie', false, null, 10);
  select id into v_grille from grilles where code = 'gonades';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Proposition à valider', 1, true) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'FSH', 'FSH', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'LH', 'LH', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Œstradiol', 'E2', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Testostérone totale', 'TESTO', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Prolactine', 'PRL', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TSH', 'TSH', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Test de grossesse', 'HCG', 'Laboratoire', true, 'si aménorrhée chez une femme en âge de procréer', 7);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Échographie pelvienne', 'ECHOPELV', 'Imagerie', false, null, 8);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Spermogramme', 'SPERMO', 'Laboratoire', true, 'si infertilité masculine', 9);
  select id into v_grille from grilles where code = 'obesite';
  insert into bilan_blocs (grille_id, titre, ordre, a_valider)
    values (v_grille, 'Proposition à valider', 1, true) returning id into v_bloc;
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Glycémie à jeun', 'GAJ', 'Laboratoire', false, null, 1);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'HbA1c', 'HBA1C', 'Laboratoire', false, null, 2);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Cholestérol total', 'CHOLT', 'Laboratoire', false, null, 3);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'HDL cholestérol', 'HDL', 'Laboratoire', false, null, 4);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'LDL cholestérol', 'LDL', 'Laboratoire', false, null, 5);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Triglycérides', 'TG', 'Laboratoire', false, null, 6);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'TSH', 'TSH', 'Laboratoire', false, null, 7);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Transaminases', 'TRANSA', 'Laboratoire', false, null, 8);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Créatinine', 'CREAT', 'Laboratoire', false, null, 9);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Uricémie', 'URIC', 'Laboratoire', false, null, 10);
  insert into bilan_examens (bloc_id, libelle, code, type, conditionnel, condition, ordre)
    values (v_bloc, 'Polygraphie ventilatoire', 'POLYGRAPHIE', 'Laboratoire', true, 'si suspicion d''apnées du sommeil', 11);
end $$;

-- ------------------------------------------------------- aide à la saisie
insert into abreviations (raccourci, texte) values
  ('ecn', 'Examen clinique sans particularité.'),
  ('acp', 'Auscultation cardio-pulmonaire sans particularité.'),
  ('absp', 'Abdomen souple, dépressible, indolore.'),
  ('cnc', 'Conjonctives normocolorées.'),
  ('bea', 'Bon état général, patient conscient et bien orienté.'),
  ('tsh', 'TSH ultrasensible'),
  ('hba', 'HbA1c'),
  ('cat', 'Conduite à tenir :'),
  ('rdv', 'Contrôle clinique et biologique dans '),
  ('reg', 'Mesures hygiéno-diététiques expliquées au patient.'),
  ('hdm', 'Histoire de la maladie :'),
  ('atcd', 'Antécédents :'),
  ('ras', 'Rien à signaler.');

insert into suggestions (domaine, valeur, code, frequence) values
  ('quartier', 'Akanda', null, 0),
  ('quartier', 'Alibandeng', null, 0),
  ('quartier', 'Angondjé', null, 0),
  ('quartier', 'Awendjé', null, 0),
  ('quartier', 'Bas de Gué-Gué', null, 0),
  ('quartier', 'Batterie IV', null, 0),
  ('quartier', 'Bellevue', null, 0),
  ('quartier', 'Charbonnages', null, 0),
  ('quartier', 'Glass', null, 0),
  ('quartier', 'Gué-Gué', null, 0),
  ('quartier', 'Lalala', null, 0),
  ('quartier', 'Louis', null, 0),
  ('quartier', 'Mont-Bouët', null, 0),
  ('quartier', 'Nkembo', null, 0),
  ('quartier', 'Nombakélé', null, 0),
  ('quartier', 'Nzeng-Ayong', null, 0),
  ('quartier', 'Okala', null, 0),
  ('quartier', 'Owendo', null, 0),
  ('quartier', 'PK5', null, 0),
  ('quartier', 'PK8', null, 0),
  ('quartier', 'PK9', null, 0),
  ('quartier', 'PK12', null, 0),
  ('quartier', 'Plaine Orety', null, 0),
  ('quartier', 'Sotega', null, 0),
  ('quartier', 'Toulon', null, 0),
  ('diagnostic', 'Diabète de type 2', 'E11', 0),
  ('diagnostic', 'Diabète de type 1', 'E10', 0),
  ('diagnostic', 'Diabète gestationnel', 'O24.4', 0),
  ('diagnostic', 'Hypothyroïdie', 'E03.9', 0),
  ('diagnostic', 'Hyperthyroïdie', 'E05.9', 0),
  ('diagnostic', 'Maladie de Basedow', 'E05.0', 0),
  ('diagnostic', 'Goitre non toxique', 'E04.9', 0),
  ('diagnostic', 'Nodule thyroïdien', 'E04.1', 0),
  ('diagnostic', 'Thyroïdite de Hashimoto', 'E06.3', 0),
  ('diagnostic', 'Hyperparathyroïdie primaire', 'E21.0', 0),
  ('diagnostic', 'Hypoparathyroïdie', 'E20.9', 0),
  ('diagnostic', 'Syndrome de Cushing', 'E24.9', 0),
  ('diagnostic', 'Insuffisance surrénalienne', 'E27.4', 0),
  ('diagnostic', 'Phéochromocytome', 'D35.0', 0),
  ('diagnostic', 'Hyperaldostéronisme primaire', 'E26.0', 0),
  ('diagnostic', 'Hyperprolactinémie', 'E22.1', 0),
  ('diagnostic', 'Acromégalie', 'E22.0', 0),
  ('diagnostic', 'Insuffisance hypophysaire', 'E23.0', 0),
  ('diagnostic', 'Obésité', 'E66.9', 0),
  ('diagnostic', 'Syndrome métabolique', 'E88.81', 0),
  ('diagnostic', 'Hypercholestérolémie pure', 'E78.0', 0),
  ('diagnostic', 'Hypertriglycéridémie', 'E78.1', 0),
  ('diagnostic', 'Syndrome des ovaires polykystiques', 'E28.2', 0),
  ('diagnostic', 'Hypogonadisme masculin', 'E29.1', 0),
  ('diagnostic', 'Puberté précoce', 'E30.1', 0),
  ('diagnostic', 'Retard pubertaire', 'E30.0', 0),
  ('diagnostic', 'Retard de croissance', 'E34.3', 0),
  ('diagnostic', 'Carence en vitamine D', 'E55.9', 0),
  ('diagnostic', 'Ostéoporose', 'M81.9', 0),
  ('diagnostic', 'Goitre multinodulaire', 'E04.2', 0),
  ('motif', 'Suivi de diabète', null, 0),
  ('motif', 'Découverte de diabète', null, 0),
  ('motif', 'Goitre', null, 0),
  ('motif', 'Nodule thyroïdien', null, 0),
  ('motif', 'Suivi d’hypothyroïdie', null, 0),
  ('motif', 'Suivi d’hyperthyroïdie', null, 0),
  ('motif', 'Prise de poids', null, 0),
  ('motif', 'Aménorrhée', null, 0),
  ('motif', 'Infertilité', null, 0),
  ('motif', 'Hirsutisme', null, 0),
  ('motif', 'Retard de croissance', null, 0),
  ('motif', 'Bilan d’anomalie biologique', null, 0),
  ('motif', 'Hypertension artérielle du sujet jeune', null, 0),
  ('motif', 'Fatigue chronique', null, 0),
  ('motif', 'Contrôle post-thyroïdectomie', null, 0),
  ('examen', 'TSH ultrasensible', 'TSHUS', 0),
  ('examen', 'FT4', 'FT4', 0),
  ('examen', 'FT3', 'FT3', 0),
  ('examen', 'TRAb', 'TRAB', 0),
  ('examen', 'Anti-TPO', 'ATPO', 0),
  ('examen', 'Anti-thyroglobuline', 'ATG', 0),
  ('examen', 'Échographie thyroïdienne avec Doppler', 'ECHOTHY', 0),
  ('examen', 'Scintigraphie thyroïdienne', 'SCINTITHY', 0),
  ('examen', 'IRM ou scanner cervico-thoracique', 'IRMCERV', 0),
  ('examen', 'ECG', 'ECG', 0),
  ('examen', 'Holter ECG', 'HOLTER', 0),
  ('examen', 'Échocardiographie Doppler', 'ECHOCARD', 0),
  ('examen', 'IGF-1', 'IGF1', 0),
  ('examen', 'GH', 'GH', 0),
  ('examen', 'Prolactine', 'PRL', 0),
  ('examen', 'ACTH', 'ACTH', 0),
  ('examen', 'Cortisol', 'CORT', 0),
  ('examen', 'FSH', 'FSH', 0),
  ('examen', 'LH', 'LH', 0),
  ('examen', 'Œstradiol', 'E2', 0),
  ('examen', 'Testostérone', 'TESTO', 0),
  ('examen', 'TSH', 'TSH', 0),
  ('examen', 'IRM hypophysaire avec gadolinium', 'IRMHYP', 0),
  ('examen', 'Champ visuel', 'CV', 0),
  ('examen', 'Glycémie à jeun', 'GAJ', 0),
  ('examen', 'HbA1c', 'HBA1C', 0),
  ('examen', 'Glycémie post-prandiale', 'GPP', 0),
  ('examen', 'Bandelette urinaire', 'BU', 0),
  ('examen', 'ECBU', 'ECBU', 0),
  ('examen', 'Créatinine', 'CREAT', 0),
  ('examen', 'DFG estimé', 'DFG', 0),
  ('examen', 'Rapport albumine/créatinine urinaire', 'RACU', 0),
  ('examen', 'Urée', 'UREE', 0),
  ('examen', 'Ionogramme sanguin', 'IONO', 0),
  ('examen', 'Acide urique', 'URIC', 0),
  ('examen', 'Albuminémie', 'ALB', 0),
  ('examen', 'Cholestérol total', 'CHOLT', 0),
  ('examen', 'HDL cholestérol', 'HDL', 0),
  ('examen', 'LDL cholestérol', 'LDL', 0),
  ('examen', 'Triglycérides', 'TG', 0),
  ('examen', 'Échographie Doppler cardiaque', 'ECHOCARD', 0),
  ('examen', 'NFS', 'NFS', 0),
  ('examen', 'CRP', 'CRP', 0),
  ('examen', 'Transaminases', 'TRANSA', 0),
  ('examen', 'Calcémie', 'CA', 0),
  ('examen', 'Fond d''œil', 'FO', 0),
  ('examen', 'Test au monofilament de 10 g', 'MONOFIL', 0),
  ('examen', 'Diapason de 128 Hz', 'DIAPASON', 0),
  ('examen', 'IPS (index de pression systolique)', 'IPS', 0),
  ('examen', 'Cortisolémie de 8 h', 'CORT8', 0),
  ('examen', 'Cortisolurie des 24 h', 'CORTU24', 0),
  ('examen', 'Cortisol salivaire', 'CORTSAL', 0),
  ('examen', '21-hydroxylase', 'OH21', 0),
  ('examen', '11β-hydroxylase', 'OH11B', 0),
  ('examen', '17α-hydroxylase', 'OH17A', 0),
  ('examen', '3β-HSD', 'HSD3B', 0),
  ('examen', 'Courbe staturale complète', 'COURBEST', 0),
  ('examen', 'Vitesse de croissance', 'VITCROISS', 0),
  ('examen', 'Taille cible génétique', 'TAILLECIBLE', 0),
  ('examen', 'Poids et évolution pondérale', 'EVOLPOND', 0),
  ('examen', 'Taille et poids de naissance', 'MESNAISS', 0),
  ('examen', 'Examen des proportions corporelles', 'PROPORTIONS', 0),
  ('examen', 'Stade pubertaire de Tanner', 'TANNER', 0),
  ('examen', 'Âge osseux', 'AGEOSSEUX', 0),
  ('examen', 'TSH + FT4', 'TSHFT4', 0),
  ('examen', 'Calcémie totale', 'CA', 0),
  ('examen', 'Calcium ionisé', 'CAION', 0),
  ('examen', 'Phosphorémie', 'PHOS', 0),
  ('examen', 'PTH', 'PTH', 0),
  ('examen', '25-OH vitamine D', 'VITD', 0),
  ('examen', 'Calciurie des 24 h', 'CAU24', 0),
  ('examen', 'Échographie cervicale', 'ECHOCERV', 0),
  ('examen', 'Ostéodensitométrie', 'DMO', 0),
  ('examen', 'Testostérone totale', 'TESTO', 0),
  ('examen', 'Test de grossesse', 'HCG', 0),
  ('examen', 'Échographie pelvienne', 'ECHOPELV', 0),
  ('examen', 'Spermogramme', 'SPERMO', 0),
  ('examen', 'Uricémie', 'URIC', 0),
  ('examen', 'Polygraphie ventilatoire', 'POLYGRAPHIE', 0)
on conflict do nothing;

-- =====================================================================
--  Vérification
-- =====================================================================
select (select count(*) from items)           as items,
       (select count(*) from grilles)         as grilles,
       (select count(*) from grille_sections) as sections,
       (select count(*) from grille_items)    as liaisons,
       (select count(*) from bilan_examens)   as examens,
       (select count(*) from suggestions)     as suggestions;
