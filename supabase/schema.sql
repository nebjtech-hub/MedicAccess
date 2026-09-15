-- =====================================================================
--  MedicAccess Gabon — Schéma de base de données
--  À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run
--  Projet : ovtepctzbqvzdgxvibit
--
--  ATTENTION : ce script DÉSACTIVE la sécurité par ligne (RLS) comme
--  demandé. Toute personne disposant de la clé publishable pourra lire
--  et écrire l'intégralité des données patients. À n'utiliser qu'en
--  développement. Voir le bloc "SÉCURISATION" en fin de fichier.
-- =====================================================================

-- ---------- Nettoyage (relançable sans erreur) ------------------------
drop table if exists ordonnance_lignes cascade;
drop table if exists ordonnances cascade;
drop table if exists examens_demandes cascade;
drop table if exists comptes_rendus cascade;
drop table if exists modeles_compte_rendu cascade;
drop table if exists consultation_parametres cascade;
drop table if exists consultations cascade;
drop table if exists documents cascade;
drop table if exists antecedents cascade;
drop table if exists patients cascade;
drop table if exists medecins cascade;
drop table if exists parametres_types cascade;

drop sequence if exists patient_code_seq;
drop sequence if exists consultation_num_seq;
drop sequence if exists cr_num_seq;
drop sequence if exists ordonnance_num_seq;

-- ---------- Séquences & générateurs de références ---------------------
create sequence patient_code_seq      start 110001;
create sequence consultation_num_seq  start 1;
create sequence cr_num_seq            start 1;
create sequence ordonnance_num_seq    start 1;

create or replace function gen_patient_code() returns text
language sql volatile as $$
  select lpad(nextval('patient_code_seq')::text, 6, '0') || '-' || to_char(now(), 'YY');
$$;

create or replace function gen_consultation_num() returns text
language sql volatile as $$
  select 'CS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('consultation_num_seq')::text, 5, '0');
$$;

create or replace function gen_cr_num() returns text
language sql volatile as $$
  select 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('cr_num_seq')::text, 5, '0');
$$;

create or replace function gen_ordonnance_num() returns text
language sql volatile as $$
  select 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('ordonnance_num_seq')::text, 5, '0');
$$;

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
--  MÉDECINS  (adossés à auth.users)
-- =====================================================================
create table medecins (
  id            uuid primary key references auth.users(id) on delete cascade,
  matricule     text,
  nom           text not null default '',
  prenom        text default '',
  civilite      text default 'Dr',
  specialite    text,
  numero_ordre  text,                       -- N° Ordre National des Médecins
  telephone     text,
  email         text,
  service       text,
  etablissement text default 'Centre Diagnostic — Libreville',
  signature     text,                       -- bloc signature imprimé sur les CR
  actif         boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create trigger trg_medecins_touch before update on medecins
  for each row execute function touch_updated_at();

-- Création automatique de la fiche médecin à l'inscription
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.medecins (id, nom, prenom, email, specialite)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    new.email,
    new.raw_user_meta_data->>'specialite'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
--  PATIENTS
-- =====================================================================
create table patients (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null default gen_patient_code(),

  -- Informations générales
  nom              text not null,
  prenom           text default '',
  sexe             text check (sexe in ('Masculin', 'Féminin')),
  date_naissance   date,
  age_presume      boolean default false,
  lieu_naissance   text,
  etat_civil       text,       -- Célibataire, Marié(e), Veuf(ve), Divorcé(e)
  date_mariage     date,
  admis_le         date,
  categorie        text,
  profession       text,
  service          text,
  nom_mere         text,
  nom_pere         text,
  photo_url        text,

  -- Adresse
  adresse          text,
  adresse2         text,
  pays             text default 'Gabon',
  departement      text,
  ville            text default 'Libreville',
  quartier         text,

  -- Contact
  telephone        text,
  mobile           text,
  email            text,
  moyen_contact    text,       -- Téléphone, SMS, Email
  medecin_traitant uuid references medecins(id) on delete set null,
  personne_urgence text,
  tel_urgence      text,

  -- Sécurité sociale / Assurance
  numero_secu          text,          -- N° d’assuré social / CNAMGS
  organisme_assurance  text,          -- CNAMGS, CNSS, Assurance privée, Aucun
  regime_assurance     text,          -- GEF, Agents publics, Secteur privé, Étudiant, Autre
  numero_carte_assure  text,
  taux_couverture      numeric(5,2) default 0,     -- en %
  convention           text,                       -- ex. BGFI, Total, Ogooué...
  numero_police        text,
  validite_assurance   date,
  assure_principal     text,
  lien_assure          text,          -- Titulaire, Conjoint, Enfant, Ascendant
  tiers_payant         boolean default false,

  -- Dossier
  groupe_sanguin   text,
  allergies        text,
  note             text,

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_patients_nom on patients (lower(nom), lower(prenom));
create index idx_patients_code on patients (code);
create index idx_patients_tel on patients (telephone);
create trigger trg_patients_touch before update on patients
  for each row execute function touch_updated_at();

-- =====================================================================
--  ANTÉCÉDENTS
-- =====================================================================
create table antecedents (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  type        text not null default 'Médical',
    -- Médical, Chirurgical, Familial, Allergique, Gynéco-obstétrical, Mode de vie
  libelle     text not null,
  description text,
  annee       text,
  created_at  timestamptz default now()
);
create index idx_antecedents_patient on antecedents (patient_id);

-- =====================================================================
--  PARAMÈTRES CLINIQUES (référentiel)
-- =====================================================================
create table parametres_types (
  id       uuid primary key default gen_random_uuid(),
  libelle  text not null unique,
  unite    text,
  ordre    int default 0,
  calcule  boolean default false,     -- true = calculé automatiquement (IMC)
  actif    boolean default true
);

insert into parametres_types (libelle, unite, ordre, calcule) values
  ('Poids',                    'kg',     1, false),
  ('Taille',                   'cm',     2, false),
  ('Température',              '°C',     3, false),
  ('PA systolique',            'mmHg',   4, false),
  ('PA diastolique',           'mmHg',   5, false),
  ('Oxymétrie',                '%',      6, false),
  ('DEXTRO',                   'g/L',    7, false),
  ('Fréquence Cardiaque',      'bpm',    8, false),
  ('Fréquence Respiratoire',   'c/min',  9, false),
  ('Indice de masse corporelle', 'kg/m²', 10, true);

-- =====================================================================
--  CONSULTATIONS
-- =====================================================================
create table consultations (
  id                  uuid primary key default gen_random_uuid(),
  numero              text unique not null default gen_consultation_num(),
  patient_id          uuid not null references patients(id) on delete cascade,
  medecin_id          uuid references medecins(id) on delete set null,
  date_consultation   timestamptz not null default now(),

  type_consultation   text default 'Consultation',
    -- Consultation, Urgence, Contrôle, Téléconsultation, Visite
  antecedents         text,
  motif               text,
  histoire_maladie    text,
  examen_clinique     text,
  examen_paraclinique text,
  diagnostic          text,
  code_cim10          text,
  conduite_a_tenir    text,
  examens_demandes    text,
  note                text,

  montant             numeric(12,2) default 0,
  paiement            numeric(12,2) default 0,
  reste_a_payer       numeric(12,2) generated always as (coalesce(montant,0) - coalesce(paiement,0)) stored,
  mode_paiement       text,      -- Espèces, Mobile Money, Carte, Tiers payant

  statut              text default 'En cours',   -- En cours, Terminée, Annulée
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index idx_consultations_patient on consultations (patient_id);
create index idx_consultations_medecin on consultations (medecin_id);
create index idx_consultations_date on consultations (date_consultation desc);
create trigger trg_consultations_touch before update on consultations
  for each row execute function touch_updated_at();

create table consultation_parametres (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  libelle         text not null,
  valeur          text,
  unite           text,
  remarque        text,
  ordre           int default 0
);
create index idx_cparams_consultation on consultation_parametres (consultation_id);

-- =====================================================================
--  MODÈLES DE COMPTE RENDU
-- =====================================================================
create table modeles_compte_rendu (
  id          uuid primary key default gen_random_uuid(),
  medecin_id  uuid references medecins(id) on delete cascade,
  nom         text not null,
  categorie   text default 'Consultation',
    -- Consultation, Imagerie, Biologie, Opératoire, Certificat, Courrier
  entete      text,
  corps       text not null default '',   -- contient les variables {{patient.nom}} etc.
  pied        text,
  partage     boolean default false,      -- visible par tous les médecins
  actif       boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create trigger trg_modeles_touch before update on modeles_compte_rendu
  for each row execute function touch_updated_at();

-- =====================================================================
--  COMPTES RENDUS
-- =====================================================================
create table comptes_rendus (
  id              uuid primary key default gen_random_uuid(),
  numero          text unique not null default gen_cr_num(),
  patient_id      uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  medecin_id      uuid references medecins(id) on delete set null,
  modele_id       uuid references modeles_compte_rendu(id) on delete set null,
  titre           text not null default 'Compte rendu de consultation',
  categorie       text default 'Consultation',
  contenu         text default '',
  statut          text default 'Brouillon',   -- Brouillon, Validé, Signé
  date_cr         timestamptz not null default now(),
  date_signature  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_cr_patient on comptes_rendus (patient_id);
create index idx_cr_date on comptes_rendus (date_cr desc);
create trigger trg_cr_touch before update on comptes_rendus
  for each row execute function touch_updated_at();

-- =====================================================================
--  ORDONNANCES
-- =====================================================================
create table ordonnances (
  id              uuid primary key default gen_random_uuid(),
  numero          text unique not null default gen_ordonnance_num(),
  patient_id      uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete cascade,
  medecin_id      uuid references medecins(id) on delete set null,
  date_ordonnance timestamptz not null default now(),
  note            text,
  created_at      timestamptz default now()
);
create index idx_ord_patient on ordonnances (patient_id);

create table ordonnance_lignes (
  id             uuid primary key default gen_random_uuid(),
  ordonnance_id  uuid not null references ordonnances(id) on delete cascade,
  medicament     text not null,
  dosage         text,
  forme          text,      -- Comprimé, Sirop, Injectable, Gélule, Pommade
  posologie      text,
  duree          text,
  quantite       text,
  instructions   text,
  ordre          int default 0
);
create index idx_ordlignes_ord on ordonnance_lignes (ordonnance_id);

-- =====================================================================
--  EXAMENS DEMANDÉS (laboratoire / imagerie)
-- =====================================================================
create table examens_demandes (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete cascade,
  medecin_id      uuid references medecins(id) on delete set null,
  type            text not null default 'Laboratoire',   -- Laboratoire, Imagerie
  libelle         text not null,
  code            text,
  urgent          boolean default false,
  statut          text default 'Demandé',   -- Demandé, En cours, Résultat disponible
  resultat        text,
  date_demande    timestamptz default now(),
  date_resultat   timestamptz
);
create index idx_exam_patient on examens_demandes (patient_id);
create index idx_exam_consultation on examens_demandes (consultation_id);

-- =====================================================================
--  DOCUMENTS
-- =====================================================================
create table documents (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  consultation_id uuid references consultations(id) on delete set null,
  nom             text not null,
  type            text,
  url             text,
  taille          bigint,
  created_at      timestamptz default now()
);
create index idx_documents_patient on documents (patient_id);

-- =====================================================================
--  DÉSACTIVATION DU RLS (demandé) + DROITS D'ACCÈS
-- =====================================================================
alter table medecins                disable row level security;
alter table patients                disable row level security;
alter table antecedents             disable row level security;
alter table parametres_types        disable row level security;
alter table consultations           disable row level security;
alter table consultation_parametres disable row level security;
alter table modeles_compte_rendu    disable row level security;
alter table comptes_rendus          disable row level security;
alter table ordonnances             disable row level security;
alter table ordonnance_lignes       disable row level security;
alter table examens_demandes        disable row level security;
alter table documents               disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- =====================================================================
--  MODÈLES DE COMPTE RENDU PAR DÉFAUT (partagés)
-- =====================================================================
insert into modeles_compte_rendu (nom, categorie, partage, entete, corps, pied) values
(
  'Compte rendu de consultation',
  'Consultation',
  true,
  E'{{etablissement}}\nCOMPTE RENDU DE CONSULTATION\nRéf. {{cr.numero}} — {{date.jour}}',
  E'Patient : {{patient.nom}} {{patient.prenom}}\nDossier n° {{patient.code}} — {{patient.sexe}}, {{patient.age}} ans (né(e) le {{patient.date_naissance}})\nAssurance : {{patient.organisme}} — {{patient.numero_secu}}\n\nMOTIF DE CONSULTATION\n{{consultation.motif}}\n\nHISTOIRE DE LA MALADIE\n{{consultation.histoire_maladie}}\n\nEXAMEN CLINIQUE\nConstantes : {{parametres.tous}}\n{{consultation.examen_clinique}}\n\nEXAMENS PARACLINIQUES\n{{consultation.examen_paraclinique}}\n\nDIAGNOSTIC RETENU\n{{consultation.diagnostic}}\n\nCONDUITE À TENIR\n{{consultation.conduite_a_tenir}}',
  E'Fait à Libreville, le {{date.jour}}\n{{medecin.civilite}} {{medecin.nom}} {{medecin.prenom}}\n{{medecin.specialite}}'
),
(
  'Certificat médical',
  'Certificat',
  true,
  E'{{etablissement}}\nCERTIFICAT MÉDICAL',
  E'Je soussigné(e), {{medecin.civilite}} {{medecin.nom}} {{medecin.prenom}}, {{medecin.specialite}}, certifie avoir examiné ce jour :\n\n{{patient.nom}} {{patient.prenom}}, {{patient.sexe}}, {{patient.age}} ans, dossier n° {{patient.code}}.\n\nConstatations : {{consultation.diagnostic}}\n\nCe certificat est délivré à la demande de l''intéressé(e) et remis en main propre pour servir et valoir ce que de droit.',
  E'Libreville, le {{date.jour}}\n{{medecin.civilite}} {{medecin.nom}} {{medecin.prenom}}'
),
(
  'Compte rendu d''imagerie',
  'Imagerie',
  true,
  E'{{etablissement}} — SERVICE D''IMAGERIE MÉDICALE\nRéf. {{cr.numero}}',
  E'Patient : {{patient.nom}} {{patient.prenom}} ({{patient.code}}) — {{patient.age}} ans\nExamen réalisé le {{consultation.date}}\nMédecin demandeur : {{medecin.nom}}\n\nINDICATION\n{{consultation.motif}}\n\nTECHNIQUE\n\nRÉSULTATS\n\nCONCLUSION\n{{consultation.diagnostic}}',
  E'{{medecin.civilite}} {{medecin.nom}} — {{date.jour}}'
);

-- =====================================================================
--  SÉCURISATION — à activer avant toute mise en production
-- =====================================================================
-- Le RLS étant désactivé, la clé publishable donne un accès total aux
-- données de santé. Pour repasser en mode sécurisé :
--
--   alter table patients enable row level security;
--   create policy "medecins authentifies" on patients
--     for all to authenticated using (true) with check (true);
--   -- (répéter pour chaque table, en affinant si besoin par medecin_id)
-- =====================================================================
