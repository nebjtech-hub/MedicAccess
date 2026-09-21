-- =====================================================================
--  MedicAccess Gabon — Référentiels examens et thérapeutique
--
--  Généré depuis les deux classeurs fournis par le médecin :
--    referentiel_examens_endocrinologie.xlsx      (186 examens)
--    referentiel_ordonnances_endocrinologie.xlsx  (62 médicaments,
--                                                  29 ordonnances types)
--
--  À exécuter APRÈS tous les scripts précédents. Relançable : les tables
--  de référentiel sont recréées, rien d'autre n'est touché.
-- =====================================================================

drop table if exists ordonnance_type_suivi cascade;
drop table if exists ordonnance_type_lignes cascade;
drop table if exists ordonnances_types cascade;
drop table if exists medicaments_ref cascade;
drop table if exists examens_ref cascade;

-- ---------------------------------------------------------------------
--  EXAMENS
--  `facteur` convertit l'unité conventionnelle vers l'unité SI :
--     valeur_SI = valeur_conventionnelle × facteur
--  Les bornes sont exprimées en unité SI.
-- ---------------------------------------------------------------------
create table examens_ref (
  code        text primary key,
  libelle     text not null,
  categorie   text,
  prelevement text,
  unite_si    text,
  unite_conv  text,
  facteur     numeric,
  reference   text,
  borne_inf   numeric,
  borne_sup   numeric,
  a_jeun      boolean,
  remarques   text
);
create index idx_examens_ref_libelle on examens_ref (lower(libelle));
create index idx_examens_ref_categorie on examens_ref (categorie);

insert into examens_ref (code, libelle, categorie, prelevement, unite_si, unite_conv,
                         facteur, reference, borne_inf, borne_sup, a_jeun, remarques) values
  ('THY-TSH', 'TSH (thyréostimuline)', 'Thyroïde', 'Sérum', 'mUI/L', 'µUI/mL', 1.0, '0,40 – 4,00 mUI/L (adulte)', 0.4, 4.0, false, '1 µUI/mL = 1 mUI/L. Cible grossesse T1 : 0,1–2,5 mUI/L.'),
  ('THY-T4L', 'T4 libre (thyroxine libre, FT4)', 'Thyroïde', 'Sérum', 'pmol/L', 'ng/dL', 12.87, '9 – 22 pmol/L (0,70 – 1,70 ng/dL)', 9.0, 22.0, false, 'Prélever avant la prise de lévothyroxine du jour.'),
  ('THY-T3L', 'T3 libre (triiodothyronine libre, FT3)', 'Thyroïde', 'Sérum', 'pmol/L', 'pg/mL', 1.536, '3,5 – 6,5 pmol/L (2,3 – 4,2 pg/mL)', 3.5, 6.5, false, null),
  ('THY-T4T', 'T4 totale', 'Thyroïde', 'Sérum', 'nmol/L', 'µg/dL', 12.87, '58 – 160 nmol/L (4,5 – 12,5 µg/dL)', 58.0, 160.0, false, 'Dépend de la TBG (grossesse, œstrogènes).'),
  ('THY-T3T', 'T3 totale', 'Thyroïde', 'Sérum', 'nmol/L', 'ng/dL', 0.01536, '1,2 – 2,7 nmol/L (80 – 180 ng/dL)', 1.2, 2.7, false, null),
  ('THY-RT3', 'T3 reverse (rT3)', 'Thyroïde', 'Sérum', 'nmol/L', 'ng/dL', 0.0154, '0,14 – 0,54 nmol/L', 0.14, 0.54, false, 'Indication limitée (syndrome de basse T3).'),
  ('THY-TPO', 'Anticorps anti-thyroperoxydase (anti-TPO)', 'Thyroïde', 'Sérum', 'kUI/L', 'UI/mL', 1.0, '< 35 kUI/L', null, 35.0, false, 'Seuil dépendant de la trousse.'),
  ('THY-ATG', 'Anticorps anti-thyroglobuline (anti-Tg)', 'Thyroïde', 'Sérum', 'kUI/L', 'UI/mL', 1.0, '< 40 kUI/L', null, 40.0, false, 'Obligatoire avec tout dosage de thyroglobuline.'),
  ('THY-TRAK', 'Anticorps anti-récepteur de la TSH (TRAK / TRAb)', 'Thyroïde', 'Sérum', 'UI/L', 'UI/L', 1.0, '< 1,75 UI/L', null, 1.75, false, 'Maladie de Basedow, suivi grossesse.'),
  ('THY-TG', 'Thyroglobuline', 'Thyroïde', 'Sérum', 'µg/L', 'ng/mL', 1.0, '1,4 – 78 µg/L ; < 0,2 µg/L après thyroïdectomie totale', null, null, false, 'Marqueur de suivi du cancer différencié.'),
  ('THY-CT', 'Calcitonine', 'Thyroïde', 'Sérum', 'ng/L', 'pg/mL', 1.0, 'H < 10 ng/L ; F < 5 ng/L', null, null, false, 'Carcinome médullaire ; prélèvement sur tube réfrigéré.'),
  ('THY-TBG', 'TBG (thyroxine binding globulin)', 'Thyroïde', 'Sérum', 'mg/L', 'µg/mL', 1.0, '12 – 30 mg/L', 12.0, 30.0, false, null),
  ('THY-IODU', 'Iodurie', 'Thyroïde', 'Urines (échantillon ou 24 h)', 'µg/L', 'µg/L', 1.0, 'Médiane populationnelle 100 – 199 µg/L', null, null, false, 'Aussi exprimée en µg/g de créatinine.'),
  ('PCA-PTH', 'PTH intacte (1-84)', 'Métabolisme phosphocalcique et osseux', 'Plasma EDTA', 'ng/L', 'pg/mL', 1.0, '15 – 65 ng/L', 15.0, 65.0, false, 'ng/L x 0,106 = pmol/L. À interpréter avec la calcémie et la vitamine D.'),
  ('PCA-CAT', 'Calcium total', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'mmol/L', 'mg/dL', 0.2495, '2,20 – 2,60 mmol/L (8,8 – 10,4 mg/dL)', 2.2, 2.6, false, null),
  ('PCA-CAI', 'Calcium ionisé', 'Métabolisme phosphocalcique et osseux', 'Sang total hépariné', 'mmol/L', 'mg/dL', 0.25, '1,15 – 1,35 mmol/L', 1.15, 1.35, false, 'Anaérobie strict, acheminement rapide.'),
  ('PCA-CACOR', 'Calcémie corrigée sur l''albumine', 'Métabolisme phosphocalcique et osseux', 'Calculé', 'mmol/L', 'mg/dL', 0.2495, '2,20 – 2,60 mmol/L', 2.2, 2.6, false, 'Ca corrigé = Ca mesuré + 0,02 x (40 - albumine g/L).'),
  ('PCA-PHOS', 'Phosphore (phosphatémie)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'mmol/L', 'mg/dL', 0.3229, '0,80 – 1,45 mmol/L (2,5 – 4,5 mg/dL)', 0.8, 1.45, true, null),
  ('PCA-MG', 'Magnésium sérique', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'mmol/L', 'mg/dL', 0.4114, '0,70 – 1,00 mmol/L', 0.7, 1.0, false, null),
  ('PCA-25OHD', '25-OH vitamine D (calcidiol)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'nmol/L', 'ng/mL', 2.496, 'Suffisance ≥ 75 nmol/L (30 ng/mL) ; carence < 25 nmol/L', 75.0, 250.0, false, 'Somme D2 + D3.'),
  ('PCA-1-25D', '1,25-(OH)2 vitamine D (calcitriol)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'pmol/L', 'pg/mL', 2.6, '48 – 160 pmol/L (18 – 62 pg/mL)', 48.0, 160.0, false, 'Réservé aux hypercalcémies et rachitismes.'),
  ('PCA-PAL', 'Phosphatases alcalines totales', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'UI/L', 'UI/L', 1.0, '40 – 130 UI/L', 40.0, 130.0, false, null),
  ('PCA-BALP', 'Phosphatase alcaline osseuse (BALP)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'µg/L', 'ng/mL', 1.0, 'H 6 – 21 µg/L ; F ménopausée 7 – 23 µg/L', null, null, false, null),
  ('PCA-OC', 'Ostéocalcine (BGP)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'µg/L', 'ng/mL', 1.0, '11 – 43 µg/L', 11.0, 43.0, true, 'Instable : congeler rapidement.'),
  ('PCA-CTX', 'CTX sérique (β-CrossLaps)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'ng/L', 'pg/mL', 1.0, 'F ménopausée < 1008 ng/L', null, null, true, 'Marqueur de résorption ; prélèvement le matin à jeun.'),
  ('PCA-P1NP', 'P1NP (propeptide N-terminal du procollagène I)', 'Métabolisme phosphocalcique et osseux', 'Sérum', 'µg/L', 'ng/mL', 1.0, '15 – 80 µg/L', 15.0, 80.0, false, 'Marqueur de formation osseuse.'),
  ('PCA-FGF23', 'FGF23 intact', 'Métabolisme phosphocalcique et osseux', 'Plasma EDTA', 'ng/L', 'pg/mL', 1.0, '< 50 ng/L', null, 50.0, false, 'Hypophosphatémies liées au FGF23.'),
  ('PCA-CAU', 'Calciurie des 24 h', 'Métabolisme phosphocalcique et osseux', 'Urines 24 h', 'mmol/24 h', 'mg/24 h', 0.02495, '2,5 – 7,5 mmol/24 h (100 – 300 mg/24 h)', 2.5, 7.5, false, 'Recueil sur acide chlorhydrique.'),
  ('PCA-PHOSU', 'Phosphaturie des 24 h', 'Métabolisme phosphocalcique et osseux', 'Urines 24 h', 'mmol/24 h', 'mg/24 h', 0.03229, '13 – 42 mmol/24 h', 13.0, 42.0, false, null),
  ('PCA-TMPGFR', 'TmP/GFR (seuil de réabsorption du phosphate)', 'Métabolisme phosphocalcique et osseux', 'Calculé', 'mmol/L', 'mg/dL', 0.3229, '0,80 – 1,35 mmol/L', 0.8, 1.35, true, 'Nomogramme de Walton-Bijvoet.'),
  ('PCA-MGU', 'Magnésurie des 24 h', 'Métabolisme phosphocalcique et osseux', 'Urines 24 h', 'mmol/24 h', 'mg/24 h', 0.04114, '3,0 – 5,0 mmol/24 h', 3.0, 5.0, false, null),
  ('PCA-DMO', 'Densité minérale osseuse (DXA)', 'Métabolisme phosphocalcique et osseux', 'Imagerie', 'g/cm² (T-score en DS)', 'g/cm²', 1.0, 'T-score ≥ -1,0 DS : normal ; ≤ -2,5 DS : ostéoporose', null, null, false, 'Rachis lombaire, fémur total, col fémoral.'),
  ('SUR-CORT8', 'Cortisol sérique (8 h)', 'Axe corticotrope et surrénale', 'Sérum', 'nmol/L', 'µg/dL', 27.59, '138 – 690 nmol/L (5 – 25 µg/dL) à 8 h', 138.0, 690.0, false, 'Rythme circadien : noter l''heure du prélèvement.'),
  ('SUR-CORTSAL', 'Cortisol salivaire de minuit', 'Axe corticotrope et surrénale', 'Salive', 'nmol/L', 'ng/mL', 2.759, '< 4 nmol/L à 23 h – minuit', null, 4.0, false, 'Dépistage du syndrome de Cushing ; 2 prélèvements.'),
  ('SUR-CLU', 'Cortisol libre urinaire des 24 h (CLU)', 'Axe corticotrope et surrénale', 'Urines 24 h', 'nmol/24 h', 'µg/24 h', 2.759, '30 – 275 nmol/24 h (11 – 100 µg/24 h)', 30.0, 275.0, false, 'Rapporter à la créatininurie pour valider le recueil.'),
  ('SUR-ACTH', 'ACTH (corticotrophine)', 'Axe corticotrope et surrénale', 'Plasma EDTA glacé', 'ng/L', 'pg/mL', 1.0, '10 – 60 ng/L à 8 h', 10.0, 60.0, false, 'ng/L x 0,22 = pmol/L. Tube glacé, centrifugation immédiate.'),
  ('SUR-DHEAS', 'SDHEA (sulfate de déhydroépiandrostérone)', 'Axe corticotrope et surrénale', 'Sérum', 'µmol/L', 'µg/dL', 0.02714, 'Variable selon âge/sexe : H 20-40 ans 2,4 – 12 µmol/L', null, null, false, 'Androgène surrénalien de référence.'),
  ('SUR-D4', 'Delta-4-androstènedione', 'Axe corticotrope et surrénale', 'Sérum', 'nmol/L', 'ng/mL', 3.49, 'F 1,0 – 11,5 nmol/L ; H 1,0 – 10,5 nmol/L', null, null, false, 'Prélèvement matinal.'),
  ('SUR-17OHP', '17-OH-progestérone', 'Axe corticotrope et surrénale', 'Sérum', 'nmol/L', 'ng/mL', 3.03, '< 6 nmol/L (2 ng/mL) à 8 h, phase folliculaire', null, 6.0, true, 'Dépistage du bloc en 21-hydroxylase ; à 8 h.'),
  ('SUR-COMPS', '11-désoxycortisol (composé S)', 'Axe corticotrope et surrénale', 'Sérum', 'nmol/L', 'ng/mL', 2.89, '< 8 nmol/L', null, 8.0, false, 'Bloc en 11-bêta-hydroxylase.'),
  ('SUR-ALDO', 'Aldostérone plasmatique', 'Axe corticotrope et surrénale', 'Plasma', 'pmol/L', 'ng/dL', 27.7, 'Couché 80 – 440 pmol/L ; debout 100 – 950 pmol/L', null, null, false, 'Position et régime sodé à préciser ; arrêt des interférents.'),
  ('SUR-RENA', 'Rénine active (dosage direct)', 'Axe corticotrope et surrénale', 'Plasma EDTA', 'mUI/L', 'µUI/mL', 1.0, 'Couché 3 – 16 mUI/L ; debout 5 – 40 mUI/L', null, null, false, 'Ne pas réfrigérer avant centrifugation (cryoactivation).'),
  ('SUR-ARP', 'Activité rénine plasmatique (ARP)', 'Axe corticotrope et surrénale', 'Plasma EDTA', 'ng/mL/h', 'ng/mL/h', 1.0, 'Couché 0,2 – 1,6 ng/mL/h ; debout 0,5 – 4,0 ng/mL/h', null, null, false, null),
  ('SUR-ARR', 'Rapport aldostérone / rénine (ARR)', 'Axe corticotrope et surrénale', 'Calculé', 'pmol/mUI', '(ng/dL)/(ng/mL/h)', 1.0, 'Positif si > 64 pmol/mUI (ou > 30 en unités conventionnelles)', null, 64.0, false, 'Dépistage de l''hyperaldostéronisme primaire.'),
  ('SUR-METAP', 'Métanéphrines libres plasmatiques', 'Axe corticotrope et surrénale', 'Plasma EDTA', 'nmol/L', 'pg/mL', 0.00507, '< 0,50 nmol/L', null, 0.5, true, 'Patient au repos couché 20 min ; PM 197,2 g/mol.'),
  ('SUR-NMETAP', 'Normétanéphrines libres plasmatiques', 'Axe corticotrope et surrénale', 'Plasma EDTA', 'nmol/L', 'pg/mL', 0.00546, '< 0,90 nmol/L', null, 0.9, true, 'PM 183,2 g/mol.'),
  ('SUR-METAU', 'Métanéphrines urinaires des 24 h', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'µmol/24 h', 'µg/24 h', 0.00507, '< 1,8 µmol/24 h (< 350 µg/24 h)', null, 1.8, false, null),
  ('SUR-NMETAU', 'Normétanéphrines urinaires des 24 h', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'µmol/24 h', 'µg/24 h', 0.00546, '< 3,3 µmol/24 h (< 600 µg/24 h)', null, 3.3, false, null),
  ('SUR-ADRU', 'Adrénaline urinaire des 24 h', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'nmol/24 h', 'µg/24 h', 5.46, '< 110 nmol/24 h (< 20 µg/24 h)', null, 110.0, false, 'PM 183,2 g/mol.'),
  ('SUR-NADRU', 'Noradrénaline urinaire des 24 h', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'nmol/24 h', 'µg/24 h', 5.91, '< 570 nmol/24 h (< 100 µg/24 h)', null, 570.0, false, 'PM 169,2 g/mol.'),
  ('SUR-DOPAU', 'Dopamine urinaire des 24 h', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'nmol/24 h', 'µg/24 h', 6.53, '< 3 240 nmol/24 h (< 500 µg/24 h)', null, 3240.0, false, 'PM 153,2 g/mol.'),
  ('SUR-VMA', 'Acide vanylmandélique (VMA) urinaire', 'Axe corticotrope et surrénale', 'Urines 24 h acidifiées', 'µmol/24 h', 'mg/24 h', 5.05, '< 35 µmol/24 h (< 7 mg/24 h)', null, 35.0, false, null),
  ('SUR-CGA', 'Chromogranine A', 'Axe corticotrope et surrénale', 'Sérum', 'µg/L', 'ng/mL', 1.0, '< 100 µg/L', null, 100.0, true, 'Faussement élevée sous IPP : arrêt 15 jours avant.'),
  ('SUR-21OH', 'Anticorps anti-21-hydroxylase', 'Axe corticotrope et surrénale', 'Sérum', 'UI/mL', 'UI/mL', 1.0, 'Négatif (< 1 UI/mL)', null, 1.0, false, 'Insuffisance surrénale auto-immune.'),
  ('SOM-GH', 'Hormone de croissance (GH)', 'Axe somatotrope', 'Sérum', 'µg/L', 'mUI/L', 0.333, 'Basale < 3 µg/L (sécrétion pulsatile : valeur isolée peu interprétable)', null, null, true, '1 µg/L ≈ 3 mUI/L (étalon IS 98/574).'),
  ('SOM-IGF1', 'IGF-1 (somatomédine C)', 'Axe somatotrope', 'Sérum', 'µg/L', 'ng/mL', 1.0, 'Interprétation obligatoire en Z-score selon âge et sexe', null, null, false, 'µg/L x 0,131 = nmol/L.'),
  ('SOM-IGFBP3', 'IGFBP-3', 'Axe somatotrope', 'Sérum', 'mg/L', 'µg/mL', 1.0, 'Adulte 2,0 – 5,0 mg/L (selon âge)', 2.0, 5.0, false, null),
  ('GON-FSH', 'FSH', 'Axe gonadotrope et reproduction', 'Sérum', 'UI/L', 'mUI/mL', 1.0, 'F phase folliculaire 3,5 – 12,5 UI/L ; ménopause > 25 UI/L ; H 1,5 – 12,4 UI/L', null, null, false, 'Préciser le jour du cycle.'),
  ('GON-LH', 'LH', 'Axe gonadotrope et reproduction', 'Sérum', 'UI/L', 'mUI/mL', 1.0, 'F phase folliculaire 2,4 – 12,6 UI/L ; H 1,7 – 8,6 UI/L', null, null, false, null),
  ('GON-E2', 'Estradiol (E2)', 'Axe gonadotrope et reproduction', 'Sérum', 'pmol/L', 'pg/mL', 3.671, 'F phase folliculaire 70 – 500 pmol/L ; H < 160 pmol/L', null, null, false, null),
  ('GON-E1', 'Estrone (E1)', 'Axe gonadotrope et reproduction', 'Sérum', 'pmol/L', 'pg/mL', 3.699, 'F 55 – 550 pmol/L', null, null, false, null),
  ('GON-PROG', 'Progestérone', 'Axe gonadotrope et reproduction', 'Sérum', 'nmol/L', 'ng/mL', 3.18, 'Phase lutéale > 16 nmol/L (ovulation confirmée) ; phase folliculaire < 3,2 nmol/L', null, null, false, 'Doser à J21-J23 du cycle.'),
  ('GON-TESTO', 'Testostérone totale', 'Axe gonadotrope et reproduction', 'Sérum', 'nmol/L', 'ng/mL', 3.467, 'H 8,6 – 29,0 nmol/L ; F 0,3 – 1,7 nmol/L', null, null, true, 'Prélèvement entre 7 h et 11 h, à jeun.'),
  ('GON-TESTOL', 'Testostérone libre', 'Axe gonadotrope et reproduction', 'Sérum', 'pmol/L', 'pg/mL', 3.467, 'H 200 – 620 pmol/L', null, null, true, 'Préférer le calcul de Vermeulen.'),
  ('GON-TESTOB', 'Testostérone biodisponible', 'Axe gonadotrope et reproduction', 'Calculé', 'nmol/L', 'ng/mL', 3.467, 'H 2,5 – 10,0 nmol/L', null, null, true, 'Calculée à partir de testostérone totale, SHBG et albumine.'),
  ('GON-DHT', 'Dihydrotestostérone (DHT)', 'Axe gonadotrope et reproduction', 'Sérum', 'nmol/L', 'ng/mL', 3.44, 'H 0,8 – 3,2 nmol/L', null, null, false, null),
  ('GON-SHBG', 'SHBG (sex hormone binding globulin)', 'Axe gonadotrope et reproduction', 'Sérum', 'nmol/L', 'µg/mL', 34.7, 'H 18 – 54 nmol/L ; F 32 – 128 nmol/L', null, null, false, null),
  ('GON-AMH', 'AMH (hormone antimüllérienne)', 'Axe gonadotrope et reproduction', 'Sérum', 'pmol/L', 'ng/mL', 7.14, 'F 18-35 ans : 10 – 45 pmol/L (1,4 – 6,3 ng/mL)', null, null, false, 'Réserve ovarienne ; élevée dans le SOPK.'),
  ('GON-INHB', 'Inhibine B', 'Axe gonadotrope et reproduction', 'Sérum', 'ng/L', 'pg/mL', 1.0, 'H 80 – 300 ng/L', null, null, false, 'Fonction sertolienne.'),
  ('GON-PRL', 'Prolactine', 'Axe gonadotrope et reproduction', 'Sérum', 'µg/L', 'mUI/L', 0.0472, 'F < 25 µg/L (530 mUI/L) ; H < 20 µg/L (425 mUI/L)', null, null, false, '1 µg/L = 21,2 mUI/L. Prélèvement au calme, 20 min après la pose.'),
  ('GON-MACROPRL', 'Macroprolactine (précipitation au PEG)', 'Axe gonadotrope et reproduction', 'Sérum', '% de récupération', '%', 1.0, 'Récupération > 60 % : pas de macroprolactinémie significative', 60.0, 100.0, false, 'À demander devant toute hyperprolactinémie asymptomatique.'),
  ('GON-HCG', 'hCG totale (bêta-hCG)', 'Axe gonadotrope et reproduction', 'Sérum', 'UI/L', 'mUI/mL', 1.0, 'Femme non enceinte < 5 UI/L', null, 5.0, false, null),
  ('GON-SPERM', 'Spermogramme – concentration', 'Axe gonadotrope et reproduction', 'Sperme', '10⁶/mL', 'millions/mL', 1.0, '≥ 16 x 10⁶/mL (OMS 2021)', 16.0, null, false, 'Abstinence 2 – 7 jours ; volume ≥ 1,4 mL ; mobilité progressive ≥ 30 %.'),
  ('EAU-OSMP', 'Osmolalité plasmatique', 'Post-hypophyse et équilibre hydro-électrolytique', 'Sérum', 'mOsm/kg H₂O', 'mOsm/kg', 1.0, '275 – 295 mOsm/kg', 275.0, 295.0, false, 'Osm calculée = 2 x Na + glycémie + urée (mmol/L).'),
  ('EAU-OSMU', 'Osmolalité urinaire', 'Post-hypophyse et équilibre hydro-électrolytique', 'Urines', 'mOsm/kg H₂O', 'mOsm/kg', 1.0, '50 – 1 200 mOsm/kg', 50.0, 1200.0, false, null),
  ('EAU-COPEP', 'Copeptine', 'Post-hypophyse et équilibre hydro-électrolytique', 'Plasma EDTA', 'pmol/L', 'pmol/L', 1.0, '< 2,6 pmol/L : diabète insipide central complet probable', null, null, false, 'Remplace le dosage d''ADH.'),
  ('EAU-ADH', 'ADH (vasopressine)', 'Post-hypophyse et équilibre hydro-électrolytique', 'Plasma EDTA glacé', 'ng/L', 'pg/mL', 1.0, '1 – 5 ng/L (osmolalité normale)', 1.0, 5.0, false, 'ng/L x 0,923 = pmol/L.'),
  ('EAU-NA', 'Sodium (natrémie)', 'Post-hypophyse et équilibre hydro-électrolytique', 'Sérum', 'mmol/L', 'mEq/L', 1.0, '135 – 145 mmol/L', 135.0, 145.0, false, null),
  ('EAU-K', 'Potassium (kaliémie)', 'Post-hypophyse et équilibre hydro-électrolytique', 'Sérum', 'mmol/L', 'mEq/L', 1.0, '3,5 – 5,1 mmol/L', 3.5, 5.1, false, 'Éviter l''hémolyse et le garrot prolongé.'),
  ('EAU-CL', 'Chlore (chlorémie)', 'Post-hypophyse et équilibre hydro-électrolytique', 'Sérum', 'mmol/L', 'mEq/L', 1.0, '98 – 107 mmol/L', 98.0, 107.0, false, null),
  ('EAU-HCO3', 'Bicarbonates (réserve alcaline)', 'Post-hypophyse et équilibre hydro-électrolytique', 'Sérum', 'mmol/L', 'mEq/L', 1.0, '22 – 29 mmol/L', 22.0, 29.0, false, null),
  ('EAU-NAU', 'Natriurèse des 24 h', 'Post-hypophyse et équilibre hydro-électrolytique', 'Urines 24 h', 'mmol/24 h', 'mEq/24 h', 1.0, '40 – 220 mmol/24 h (reflet des apports sodés)', 40.0, 220.0, false, 'Na urinaire (mmol) / 17 = g de sel ingéré.'),
  ('EAU-KU', 'Kaliurèse des 24 h', 'Post-hypophyse et équilibre hydro-électrolytique', 'Urines 24 h', 'mmol/24 h', 'mEq/24 h', 1.0, '25 – 125 mmol/24 h', 25.0, 125.0, false, null),
  ('EAU-DENSU', 'Densité urinaire', 'Post-hypophyse et équilibre hydro-électrolytique', 'Urines', 'sans unité', 'sans unité', 1.0, '1,003 – 1,030', 1.003, 1.03, false, null),
  ('GLU-GAJ', 'Glycémie veineuse à jeun', 'Métabolisme glucidique et diabète', 'Plasma fluoré', 'mmol/L', 'g/L', 5.551, '3,9 – 5,5 mmol/L (0,70 – 1,00 g/L) ; diabète ≥ 7,0 mmol/L (1,26 g/L)', 3.9, 5.5, true, 'mg/dL x 0,0555 = mmol/L. Jeûne de 8 h.'),
  ('GLU-GPP', 'Glycémie post-prandiale (2 h)', 'Métabolisme glucidique et diabète', 'Plasma fluoré', 'mmol/L', 'g/L', 5.551, '< 7,8 mmol/L (1,40 g/L)', null, 7.8, false, null),
  ('GLU-HGPO', 'HGPO 75 g – glycémie à T120', 'Métabolisme glucidique et diabète', 'Plasma fluoré', 'mmol/L', 'g/L', 5.551, 'Normal < 7,8 ; intolérance 7,8 – 11,0 ; diabète ≥ 11,1 mmol/L', null, 7.8, true, '75 g de glucose ; grossesse : seuils 5,1 / 10,0 / 8,5 mmol/L (T0/T60/T120).'),
  ('GLU-HBA1C', 'Hémoglobine glyquée (HbA1c)', 'Métabolisme glucidique et diabète', 'Sang total EDTA', '% (NGSP)', 'mmol/mol (IFCC)', 1.0, 'Non diabétique < 5,7 % ; diabète ≥ 6,5 % ; cible usuelle < 7 %', null, 5.7, false, 'IFCC (mmol/mol) = (HbA1c % - 2,15) x 10,929. Ininterprétable si hémoglobinopathie ou hémolyse.'),
  ('GLU-FRUCTO', 'Fructosamine', 'Métabolisme glucidique et diabète', 'Sérum', 'µmol/L', 'µmol/L', 1.0, '205 – 285 µmol/L', 205.0, 285.0, false, 'Alternative à l''HbA1c (drépanocytose, grossesse) : reflet de 2-3 semaines.'),
  ('GLU-INS', 'Insulinémie à jeun', 'Métabolisme glucidique et diabète', 'Sérum', 'pmol/L', 'µUI/mL', 6.945, '17 – 173 pmol/L (2,5 – 25 µUI/mL)', 17.0, 173.0, true, null),
  ('GLU-CPEP', 'Peptide C', 'Métabolisme glucidique et diabète', 'Sérum', 'nmol/L', 'ng/mL', 0.331, '0,26 – 1,03 nmol/L à jeun (0,8 – 3,1 ng/mL)', 0.26, 1.03, true, 'Évalue l''insulinosécrétion résiduelle ; coupler à la glycémie du moment.'),
  ('GLU-HOMA', 'HOMA-IR (indice d''insulinorésistance)', 'Métabolisme glucidique et diabète', 'Calculé', 'sans unité', 'sans unité', 1.0, '< 2,4 : normal ; > 3 : insulinorésistance', null, 2.4, true, 'HOMA-IR = glycémie (mmol/L) x insuline (µUI/mL) / 22,5.'),
  ('GLU-QUICKI', 'QUICKI', 'Métabolisme glucidique et diabète', 'Calculé', 'sans unité', 'sans unité', 1.0, '> 0,34 : sensibilité normale à l''insuline', 0.34, null, true, '1 / [log(insuline µUI/mL) + log(glycémie mg/dL)].'),
  ('GLU-GAD', 'Anticorps anti-GAD65', 'Métabolisme glucidique et diabète', 'Sérum', 'UI/mL', 'UI/mL', 1.0, '< 10 UI/mL (seuil selon trousse)', null, 10.0, false, 'Diabète de type 1, LADA.'),
  ('GLU-IA2', 'Anticorps anti-IA2', 'Métabolisme glucidique et diabète', 'Sérum', 'UI/mL', 'UI/mL', 1.0, '< 10 UI/mL', null, 10.0, false, null),
  ('GLU-ZNT8', 'Anticorps anti-ZnT8', 'Métabolisme glucidique et diabète', 'Sérum', 'UI/mL', 'UI/mL', 1.0, '< 15 UI/mL', null, 15.0, false, null),
  ('GLU-IAA', 'Anticorps anti-insuline (IAA)', 'Métabolisme glucidique et diabète', 'Sérum', 'UI/mL', 'UI/mL', 1.0, 'Négatif', null, null, false, 'Ininterprétable après insulinothérapie.'),
  ('GLU-ICA', 'Anticorps anti-îlots (ICA)', 'Métabolisme glucidique et diabète', 'Sérum', 'unités JDF', 'unités JDF', 1.0, '< 10 unités JDF', null, 10.0, false, null),
  ('GLU-BHB', 'Bêta-hydroxybutyrate (corps cétoniques)', 'Métabolisme glucidique et diabète', 'Sang total / Plasma', 'mmol/L', 'mmol/L', 1.0, '< 0,6 mmol/L ; > 3,0 mmol/L : acidocétose probable', null, 0.6, false, null),
  ('GLU-CETU', 'Cétonurie', 'Métabolisme glucidique et diabète', 'Urines', 'croix (semi-quantitatif)', 'mg/dL', 1.0, 'Négative', null, null, false, 'Détecte l''acétoacétate, pas le BHB.'),
  ('GLU-GLYCU', 'Glycosurie', 'Métabolisme glucidique et diabète', 'Urines', 'mmol/L', 'g/L', 5.551, 'Négative (< 2,8 mmol/L)', null, 2.8, false, 'Faussement positive sous iSGLT2.'),
  ('GLU-MALB', 'Microalbuminurie (échantillon)', 'Métabolisme glucidique et diabète', 'Urines', 'mg/L', 'mg/L', 1.0, '< 20 mg/L', null, 20.0, false, null),
  ('GLU-ALBU24', 'Albuminurie des 24 h', 'Métabolisme glucidique et diabète', 'Urines 24 h', 'mg/24 h', 'mg/24 h', 1.0, '< 30 mg/24 h ; 30 – 300 : néphropathie débutante', null, 30.0, false, null),
  ('GLU-RAC', 'Rapport albumine / créatinine urinaire (RAC)', 'Métabolisme glucidique et diabète', 'Urines (1er jet du matin)', 'mg/mmol', 'mg/g', 0.113, '< 3 mg/mmol (< 30 mg/g)', null, 3.0, false, 'Examen de référence pour le dépistage annuel de la néphropathie diabétique.'),
  ('GLU-CREAT', 'Créatininémie', 'Métabolisme glucidique et diabète', 'Sérum', 'µmol/L', 'mg/dL', 88.4, 'H 62 – 106 µmol/L ; F 44 – 80 µmol/L', null, null, false, null),
  ('GLU-DFG', 'DFG estimé (CKD-EPI 2021)', 'Métabolisme glucidique et diabète', 'Calculé', 'mL/min/1,73 m²', 'mL/min/1,73 m²', 1.0, '≥ 90 : normal ; < 60 : insuffisance rénale', 90.0, null, false, null),
  ('LIP-CT', 'Cholestérol total', 'Métabolisme lipidique', 'Sérum', 'mmol/L', 'g/L', 2.586, '< 5,2 mmol/L (2,00 g/L)', null, 5.2, true, 'mg/dL x 0,02586 = mmol/L.'),
  ('LIP-HDL', 'HDL-cholestérol', 'Métabolisme lipidique', 'Sérum', 'mmol/L', 'g/L', 2.586, 'H > 1,0 mmol/L ; F > 1,3 mmol/L', null, null, true, null),
  ('LIP-LDL', 'LDL-cholestérol', 'Métabolisme lipidique', 'Sérum / Calculé', 'mmol/L', 'g/L', 2.586, 'Cible selon risque CV : < 3,0 / 2,6 / 1,8 / 1,4 mmol/L', null, null, true, 'Friedewald invalide si TG > 4,5 mmol/L : utiliser un dosage direct ou Martin-Hopkins.'),
  ('LIP-NHDL', 'Non-HDL-cholestérol', 'Métabolisme lipidique', 'Calculé', 'mmol/L', 'g/L', 2.586, 'Cible = LDL cible + 0,8 mmol/L', null, null, false, 'CT - HDL.'),
  ('LIP-TG', 'Triglycérides', 'Métabolisme lipidique', 'Sérum', 'mmol/L', 'g/L', 1.129, '< 1,7 mmol/L (1,50 g/L)', null, 1.7, true, 'mg/dL x 0,01129 = mmol/L. Jeûne de 12 h.'),
  ('LIP-APOA1', 'Apolipoprotéine A1', 'Métabolisme lipidique', 'Sérum', 'g/L', 'mg/dL', 0.01, 'H 1,10 – 2,05 g/L ; F 1,25 – 2,15 g/L', null, null, true, null),
  ('LIP-APOB', 'Apolipoprotéine B', 'Métabolisme lipidique', 'Sérum', 'g/L', 'mg/dL', 0.01, '< 1,00 g/L ; < 0,65 g/L si haut risque CV', null, 1.0, true, null),
  ('LIP-LPA', 'Lipoprotéine (a) – Lp(a)', 'Métabolisme lipidique', 'Sérum', 'nmol/L', 'mg/dL', null, '< 75 nmol/L (< 30 mg/dL)', null, 75.0, false, 'Pas de facteur de conversion universel entre nmol/L et mg/dL (hétérogénéité des isoformes). Dosage une fois dans la vie.'),
  ('LIP-RATIO', 'Rapport cholestérol total / HDL', 'Métabolisme lipidique', 'Calculé', 'sans unité', 'sans unité', 1.0, '< 5 chez l''homme ; < 4,5 chez la femme', null, 5.0, true, null),
  ('LIP-EPP', 'Électrophorèse des lipoprotéines', 'Métabolisme lipidique', 'Sérum', 'profil (qualitatif)', null, null, 'Profil normal', null, null, true, 'Classification de Fredrickson.'),
  ('LIP-NEFA', 'Acides gras libres (NEFA)', 'Métabolisme lipidique', 'Sérum', 'mmol/L', 'mEq/L', 1.0, '0,1 – 0,6 mmol/L', 0.1, 0.6, true, null),
  ('MET-URIC', 'Acide urique', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'mg/dL', 59.48, 'H 200 – 420 µmol/L ; F 140 – 360 µmol/L', null, null, false, null),
  ('MET-UREE', 'Urée', 'Métabolisme général et nutrition', 'Sérum', 'mmol/L', 'g/L', 16.65, '2,5 – 7,5 mmol/L (0,15 – 0,45 g/L)', 2.5, 7.5, false, 'mg/dL d''urée x 0,1665 = mmol/L ; mg/dL de BUN x 0,357 = mmol/L.'),
  ('MET-LACT', 'Lactate', 'Métabolisme général et nutrition', 'Plasma fluoré', 'mmol/L', 'mg/dL', 0.111, '0,5 – 2,2 mmol/L', 0.5, 2.2, false, 'Sans garrot, acheminement sur glace.'),
  ('MET-PYR', 'Pyruvate', 'Métabolisme général et nutrition', 'Sang total', 'µmol/L', 'mg/dL', 113.6, '40 – 130 µmol/L', 40.0, 130.0, true, 'Rapport lactate/pyruvate < 20.'),
  ('MET-NH3', 'Ammoniémie', 'Métabolisme général et nutrition', 'Plasma EDTA glacé', 'µmol/L', 'µg/dL', 0.5872, '11 – 51 µmol/L', 11.0, 51.0, false, 'Tube glacé, dosage < 30 min.'),
  ('MET-HCY', 'Homocystéine', 'Métabolisme général et nutrition', 'Plasma EDTA', 'µmol/L', 'mg/L', 7.397, '5 – 15 µmol/L', 5.0, 15.0, true, 'Centrifugation rapide sinon faussement élevée.'),
  ('MET-CRP', 'CRP ultrasensible', 'Métabolisme général et nutrition', 'Sérum', 'mg/L', 'mg/dL', 10.0, '< 1 mg/L : risque CV faible ; > 3 mg/L : risque élevé', null, 3.0, false, null),
  ('MET-ALB', 'Albumine', 'Métabolisme général et nutrition', 'Sérum', 'g/L', 'g/dL', 10.0, '35 – 50 g/L', 35.0, 50.0, false, null),
  ('MET-PREALB', 'Préalbumine (transthyrétine)', 'Métabolisme général et nutrition', 'Sérum', 'g/L', 'mg/dL', 0.01, '0,20 – 0,40 g/L', 0.2, 0.4, false, 'Marqueur nutritionnel précoce.'),
  ('MET-PROT', 'Protéines totales', 'Métabolisme général et nutrition', 'Sérum', 'g/L', 'g/dL', 10.0, '64 – 83 g/L', 64.0, 83.0, false, null),
  ('MET-ASAT', 'ASAT (TGO)', 'Métabolisme général et nutrition', 'Sérum', 'UI/L', 'UI/L', 1.0, '< 35 UI/L', null, 35.0, false, null),
  ('MET-ALAT', 'ALAT (TGP)', 'Métabolisme général et nutrition', 'Sérum', 'UI/L', 'UI/L', 1.0, 'H < 41 UI/L ; F < 33 UI/L', null, null, false, 'Dépistage de la stéatose métabolique (MASLD).'),
  ('MET-GGT', 'Gamma-GT', 'Métabolisme général et nutrition', 'Sérum', 'UI/L', 'UI/L', 1.0, 'H < 55 UI/L ; F < 38 UI/L', null, null, false, null),
  ('MET-BILIT', 'Bilirubine totale', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'mg/dL', 17.1, '< 21 µmol/L', null, 21.0, false, null),
  ('MET-CK', 'Créatine kinase (CK)', 'Métabolisme général et nutrition', 'Sérum', 'UI/L', 'UI/L', 1.0, 'H < 190 UI/L ; F < 170 UI/L', null, null, false, 'Surveillance sous statine.'),
  ('MET-FERR', 'Ferritine', 'Métabolisme général et nutrition', 'Sérum', 'µg/L', 'ng/mL', 1.0, 'H 30 – 400 µg/L ; F 15 – 150 µg/L', null, null, false, 'Protéine de l''inflammation.'),
  ('MET-FER', 'Fer sérique', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'µg/dL', 0.179, 'H 11 – 28 µmol/L ; F 7 – 26 µmol/L', null, null, true, 'Prélèvement matinal.'),
  ('MET-TRF', 'Transferrine', 'Métabolisme général et nutrition', 'Sérum', 'g/L', 'mg/dL', 0.01, '2,0 – 3,6 g/L', 2.0, 3.6, false, null),
  ('MET-CST', 'Coefficient de saturation de la transferrine', 'Métabolisme général et nutrition', 'Calculé', '%', '%', 1.0, '20 – 40 % ; > 45 % : suspicion d''hémochromatose', 20.0, 40.0, true, 'Hémochromatose = cause d''un « diabète bronzé ».'),
  ('MET-B12', 'Vitamine B12 (cobalamine)', 'Métabolisme général et nutrition', 'Sérum', 'pmol/L', 'pg/mL', 0.738, '145 – 570 pmol/L (200 – 770 pg/mL)', 145.0, 570.0, false, 'Surveillance sous metformine au long cours.'),
  ('MET-B9', 'Folates sériques (vitamine B9)', 'Métabolisme général et nutrition', 'Sérum', 'nmol/L', 'ng/mL', 2.266, '> 10 nmol/L', 10.0, null, true, null),
  ('MET-B9E', 'Folates érythrocytaires', 'Métabolisme général et nutrition', 'Sang total EDTA', 'nmol/L', 'ng/mL', 2.266, '340 – 1 020 nmol/L', 340.0, 1020.0, false, null),
  ('MET-B1', 'Vitamine B1 (thiamine)', 'Métabolisme général et nutrition', 'Sang total EDTA', 'nmol/L', 'µg/L', 2.96, '70 – 180 nmol/L', 70.0, 180.0, false, 'Photosensible : tube opaque.'),
  ('MET-VITA', 'Vitamine A (rétinol)', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'µg/dL', 0.0349, '1,0 – 2,8 µmol/L', 1.0, 2.8, true, 'Photosensible.'),
  ('MET-VITE', 'Vitamine E (alpha-tocophérol)', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'mg/L', 2.32, '12 – 42 µmol/L', 12.0, 42.0, true, null),
  ('MET-ZN', 'Zinc', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'µg/dL', 0.153, '11 – 18 µmol/L', 11.0, 18.0, true, 'Tube sans élément-trace.'),
  ('MET-SE', 'Sélénium', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'µg/L', 0.0127, '0,8 – 1,6 µmol/L', 0.8, 1.6, false, null),
  ('MET-CU', 'Cuivre', 'Métabolisme général et nutrition', 'Sérum', 'µmol/L', 'µg/dL', 0.157, '11 – 22 µmol/L', 11.0, 22.0, false, null),
  ('ADI-LEP', 'Leptine', 'Tissu adipeux, obésité et satiété', 'Sérum', 'µg/L', 'ng/mL', 1.0, 'H 1 – 10 µg/L ; F 3 – 25 µg/L (corrélée à la masse grasse)', null, null, true, null),
  ('ADI-ADIPO', 'Adiponectine', 'Tissu adipeux, obésité et satiété', 'Sérum', 'mg/L', 'µg/mL', 1.0, '5 – 30 mg/L (basse dans l''insulinorésistance)', 5.0, 30.0, true, null),
  ('ADI-GHREL', 'Ghréline', 'Tissu adipeux, obésité et satiété', 'Plasma EDTA + aprotinine', 'ng/L', 'pg/mL', 1.0, '300 – 1 200 ng/L à jeun', null, null, true, null),
  ('ADI-GLP1', 'GLP-1 actif', 'Tissu adipeux, obésité et satiété', 'Plasma EDTA + inhibiteur DPP-4', 'pmol/L', 'pmol/L', 1.0, 'À jeun 5 – 10 pmol/L', null, null, true, null),
  ('ADI-RESIST', 'Résistine', 'Tissu adipeux, obésité et satiété', 'Sérum', 'µg/L', 'ng/mL', 1.0, '2 – 20 µg/L', null, null, true, 'Usage essentiellement de recherche.'),
  ('NET-GASTR', 'Gastrine', 'Tumeurs neuroendocrines et hormones digestives', 'Sérum', 'ng/L', 'pg/mL', 1.0, '< 100 ng/L à jeun', null, 100.0, true, 'Arrêt des IPP 2 semaines avant (sauf contre-indication).'),
  ('NET-GLUCAG', 'Glucagon', 'Tumeurs neuroendocrines et hormones digestives', 'Plasma EDTA + aprotinine', 'ng/L', 'pg/mL', 1.0, '< 80 ng/L', null, 80.0, true, 'Tube glacé.'),
  ('NET-VIP', 'VIP (peptide intestinal vasoactif)', 'Tumeurs neuroendocrines et hormones digestives', 'Plasma EDTA + aprotinine', 'ng/L', 'pg/mL', 1.0, '< 30 ng/L', null, 30.0, true, null),
  ('NET-PP', 'Polypeptide pancréatique (PP)', 'Tumeurs neuroendocrines et hormones digestives', 'Plasma EDTA', 'ng/L', 'pg/mL', 1.0, '< 100 ng/L', null, 100.0, true, null),
  ('NET-SOMATO', 'Somatostatine', 'Tumeurs neuroendocrines et hormones digestives', 'Plasma EDTA + aprotinine', 'ng/L', 'pg/mL', 1.0, '< 30 ng/L', null, 30.0, true, null),
  ('NET-SERO', 'Sérotonine sanguine', 'Tumeurs neuroendocrines et hormones digestives', 'Sang total', 'µg/L', 'ng/mL', 1.0, '50 – 200 µg/L', 50.0, 200.0, true, 'Régime sans aliments sérotoninergiques 72 h avant.'),
  ('NET-5HIAA', '5-HIAA urinaire des 24 h', 'Tumeurs neuroendocrines et hormones digestives', 'Urines 24 h acidifiées', 'µmol/24 h', 'mg/24 h', 5.23, '< 50 µmol/24 h (< 10 mg/24 h)', null, 50.0, false, 'Éviter bananes, avocats, noix, ananas 72 h avant.'),
  ('DYN-DXM1', 'Test de freinage minute à la dexaméthasone 1 mg', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'nmol/L (cortisol à 8 h)', 'µg/dL', 27.59, 'Freinage normal : cortisol < 50 nmol/L (1,8 µg/dL)', null, 50.0, false, '1 mg per os à 23 h, cortisol le lendemain à 8 h.'),
  ('DYN-DXM2', 'Test de freinage faible 2 mg/j x 48 h', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'nmol/L (cortisol)', 'µg/dL', 27.59, 'Cortisol < 50 nmol/L à H48', null, 50.0, false, '0,5 mg / 6 h pendant 2 jours.'),
  ('DYN-DXM8', 'Test de freinage fort 8 mg', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', '% de freinage du cortisol', '%', 1.0, 'Freinage > 50 % : maladie de Cushing probable', 50.0, null, false, 'Différencie maladie de Cushing et sécrétion ectopique d''ACTH.'),
  ('DYN-SYNAC', 'Test au Synacthène immédiat (250 µg)', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'nmol/L (cortisol T60)', 'µg/dL', 27.59, 'Réponse normale : cortisol > 500 nmol/L (18 µg/dL) à T30-T60', 500.0, null, false, 'Diagnostic d''insuffisance surrénale.'),
  ('DYN-HYPOINS', 'Hypoglycémie insulinique (test à l''insuline)', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'µg/L (GH) et nmol/L (cortisol)', null, null, 'Pic GH > 5 µg/L et cortisol > 500 nmol/L', null, null, true, 'Test de référence de l''axe corticotrope/somatotrope. Contre-indiqué : coronaropathie, épilepsie, sujet âgé.'),
  ('DYN-HGPOGH', 'HGPO 75 g – freinage de la GH', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'µg/L (GH nadir)', 'ng/mL', 1.0, 'Freinage normal : nadir GH < 0,4 µg/L', null, 0.4, true, 'Diagnostic d''acromégalie.'),
  ('DYN-JEUNE', 'Épreuve de jeûne de 72 heures', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'pmol/L (insuline) / nmol/L (peptide C)', null, null, 'Pathologique : glycémie < 2,5 mmol/L avec insuline ≥ 18 pmol/L et peptide C ≥ 0,2 nmol/L', null, null, true, 'Diagnostic d''insulinome ; hospitalisation obligatoire.'),
  ('DYN-GNRH', 'Test au GnRH (LHRH)', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'UI/L (LH, FSH)', 'mUI/mL', 1.0, 'Réponse pubère : pic de LH > 5 UI/L', null, null, false, '100 µg IV, dosages T0-T30-T60.'),
  ('DYN-TRH', 'Test à la TRH', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'mUI/L (TSH) / µg/L (prolactine)', null, null, 'Pic de TSH à T30 : x2 à x5 de la valeur de base', null, null, false, 'Indication devenue rare.'),
  ('DYN-RESTRICT', 'Épreuve de restriction hydrique', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum / Urines', 'mOsm/kg', 'mOsm/kg', 1.0, 'Concentration urinaire normale > 800 mOsm/kg', 800.0, null, false, 'Diagnostic différentiel des polyuro-polydipsies ; surveillance médicale stricte.'),
  ('DYN-CAPTO', 'Test au captopril', 'Tests dynamiques et épreuves fonctionnelles', 'Plasma', 'pmol/mUI (rapport aldo/rénine)', null, null, 'Aldostérone non freinée (> 30 % de la base) : hyperaldostéronisme primaire', null, null, false, null),
  ('DYN-CHARGESEL', 'Test de charge sodée', 'Tests dynamiques et épreuves fonctionnelles', 'Urines 24 h / Plasma', 'nmol/24 h (aldostérone urinaire)', 'µg/24 h', 2.77, 'Aldostéronurie > 33 nmol/24 h (12 µg/24 h) : hyperaldostéronisme primaire', null, null, false, null),
  ('DYN-CVS', 'Cathétérisme des veines surrénales', 'Tests dynamiques et épreuves fonctionnelles', 'Plasma', 'rapport de latéralisation (sans unité)', null, null, 'Latéralisation si rapport > 4 après Synacthène', null, null, false, 'Examen de référence avant surrénalectomie.'),
  ('DYN-GLUCAGGH', 'Test au glucagon (GH et cortisol)', 'Tests dynamiques et épreuves fonctionnelles', 'Sérum', 'µg/L (GH) / nmol/L (cortisol)', null, null, 'Pic GH > 3 µg/L ; cortisol > 500 nmol/L', null, null, true, 'Alternative à l''hypoglycémie insulinique.'),
  ('GEN-CYP21', 'Séquençage CYP21A2', 'Génétique et biologie moléculaire', 'Sang total EDTA', 'qualitatif', null, null, 'Absence de variant pathogène', null, null, false, 'Hyperplasie congénitale des surrénales.'),
  ('GEN-MEN1', 'Recherche de mutation MEN1', 'Génétique et biologie moléculaire', 'Sang total EDTA', 'qualitatif', null, null, 'Absence de variant pathogène', null, null, false, 'Néoplasie endocrinienne multiple de type 1.'),
  ('GEN-RET', 'Recherche de mutation RET', 'Génétique et biologie moléculaire', 'Sang total EDTA', 'qualitatif', null, null, 'Absence de variant pathogène', null, null, false, 'NEM2 / carcinome médullaire thyroïdien.'),
  ('GEN-MODY', 'Panel MODY (GCK, HNF1A, HNF4A, HNF1B…)', 'Génétique et biologie moléculaire', 'Sang total EDTA', 'qualitatif', null, null, 'Absence de variant pathogène', null, null, false, 'Diabète non auto-immun du sujet jeune, antécédents familiaux sur 3 générations.'),
  ('GEN-SDHX', 'Panel SDHx (phéochromocytome/paragangliome)', 'Génétique et biologie moléculaire', 'Sang total EDTA', 'qualitatif', null, null, 'Absence de variant pathogène', null, null, false, null),
  ('GEN-CARYO', 'Caryotype constitutionnel', 'Génétique et biologie moléculaire', 'Sang total hépariné', 'formule chromosomique', null, null, '46,XX ou 46,XY', null, null, false, 'Turner, Klinefelter, anomalies du développement sexuel.'),
  ('CLI-POIDS', 'Poids', 'Mesures cliniques et anthropométriques', 'Mesure clinique', 'kg', 'kg', 1.0, null, null, null, false, null),
  ('CLI-TAILLE', 'Taille', 'Mesures cliniques et anthropométriques', 'Mesure clinique', 'cm', 'cm', 1.0, null, null, null, false, null),
  ('CLI-IMC', 'Indice de masse corporelle (IMC)', 'Mesures cliniques et anthropométriques', 'Calculé', 'kg/m²', 'kg/m²', 1.0, '18,5 – 24,9 : normal ; 25 – 29,9 : surpoids ; ≥ 30 : obésité', 18.5, 24.9, false, 'Poids (kg) / taille² (m).'),
  ('CLI-TDT', 'Tour de taille', 'Mesures cliniques et anthropométriques', 'Mesure clinique', 'cm', 'cm', 1.0, 'H < 94 cm ; F < 80 cm', null, null, false, 'Critère du syndrome métabolique.'),
  ('CLI-RTH', 'Rapport taille / hanches', 'Mesures cliniques et anthropométriques', 'Calculé', 'sans unité', 'sans unité', 1.0, 'H < 0,90 ; F < 0,85', null, null, false, null),
  ('CLI-MG', 'Masse grasse (impédancemétrie)', 'Mesures cliniques et anthropométriques', 'Mesure clinique', '%', '%', 1.0, 'H 10 – 20 % ; F 20 – 30 %', null, null, false, null),
  ('CLI-TA', 'Pression artérielle', 'Mesures cliniques et anthropométriques', 'Mesure clinique', 'mmHg', 'mmHg', 1.0, '< 140/90 mmHg au cabinet ; < 135/85 en automesure', null, null, false, null),
  ('CLI-MONOFIL', 'Test au monofilament 10 g', 'Mesures cliniques et anthropométriques', 'Examen clinique', 'nombre de points perçus / 10', null, null, 'Normal : 8/10 points perçus ou plus', 8.0, 10.0, false, 'Dépistage annuel de la neuropathie diabétique.'),
  ('CLI-IPS', 'Index de pression systolique (IPS)', 'Mesures cliniques et anthropométriques', 'Examen clinique', 'sans unité', 'sans unité', 1.0, '0,90 – 1,30 : normal ; < 0,90 : AOMI ; > 1,30 : médiacalcose', 0.9, 1.3, false, null);

-- ---------------------------------------------------------------------
--  MÉDICAMENTS
-- ---------------------------------------------------------------------
create table medicaments_ref (
  code              text primary key,
  dci               text not null,
  classe            text,
  formes            text,
  voie              text,
  posologie         text,
  dose_max          text,
  adaptation_renale text,
  surveillance      text,
  contre_indications text,
  grossesse         text,
  disponibilite     text,
  remarques         text
);
create index idx_medicaments_ref_dci on medicaments_ref (lower(dci));

insert into medicaments_ref (code, dci, classe, formes, voie, posologie, dose_max,
                            adaptation_renale, surveillance, contre_indications,
                            grossesse, disponibilite, remarques) values
  ('MED-LEVO', 'Lévothyroxine sodique', 'Hormone thyroïdienne', 'Cp 25, 50, 75, 100, 125, 150, 200 µg', 'Orale', 'Adulte : 1,6 µg/kg/j en 1 prise le matin. Sujet âgé ou coronarien : débuter à 12,5–25 µg/j, augmenter de 12,5–25 µg toutes les 4–6 semaines.', '300 µg/j', 'Pas d''adaptation', 'TSH 6–8 semaines après toute modification de dose, puis 1 fois/an à l''équilibre', 'Thyrotoxicose non traitée, infarctus récent, insuffisance surrénale non substituée', 'Poursuivre et augmenter les besoins de 25–30 % dès le diagnostic de grossesse', 'Courante', 'À jeun, 30 min avant le petit-déjeuner. Éloigner de 4 h : fer, calcium, IPP, hydroxyde d''aluminium. Ne pas changer de marque sans recontrôle de la TSH.'),
  ('MED-CARBI', 'Carbimazole', 'Antithyroïdien de synthèse', 'Cp 5 mg et 20 mg', 'Orale', 'Attaque : 20–40 mg/j en 1–2 prises pendant 4–6 semaines. Entretien : 5–15 mg/j.', '60 mg/j', 'Pas d''adaptation', 'NFS avant traitement puis en urgence si fièvre/angine ; transaminases ; TSH et T4L toutes les 4–6 semaines', 'Agranulocytose antérieure sous ATS, hépatopathie sévère', 'Éviter au 1er trimestre (embryopathie) : relais par propylthiouracile', 'Courante', 'Remettre au patient une consigne écrite : toute fièvre ou angine impose l''arrêt immédiat et une NFS en urgence.'),
  ('MED-PTU', 'Propylthiouracile', 'Antithyroïdien de synthèse', 'Cp 50 mg', 'Orale', 'Attaque : 150–300 mg/j en 3 prises. Entretien : 50–150 mg/j.', '600 mg/j', 'Pas d''adaptation', 'Transaminases (hépatotoxicité), NFS, TSH/T4L toutes les 4–6 semaines', 'Hépatopathie, antécédent d''agranulocytose', 'Molécule de choix au 1er trimestre, relais par carbimazole ensuite', 'Variable', 'Risque d''hépatite fulminante : ne pas utiliser en 1re intention hors grossesse.'),
  ('MED-PROPRA', 'Propranolol', 'Bêtabloquant non cardiosélectif', 'Cp 40 mg, cp LP 160 mg', 'Orale', '40 mg × 2 à 3/j en traitement symptomatique de la thyrotoxicose.', '160 mg/j en usage endocrinien', 'Prudence si insuffisance rénale sévère', 'Fréquence cardiaque, pression artérielle', 'Asthme, BPCO sévère, bradycardie, bloc auriculo-ventriculaire, Raynaud', 'Possible si nécessaire, surveillance néonatale', 'Courante', 'Soulage tremblements et tachycardie en attendant l''effet des antithyroïdiens (2–4 semaines).'),
  ('MED-LUGOL', 'Solution de Lugol (iodure de potassium)', 'Iode inorganique', 'Solution à 5 %', 'Orale', '5–10 gouttes × 3/j pendant les 10 jours précédant une thyroïdectomie.', null, 'Pas d''adaptation', 'TSH, T4L', 'Allergie à l''iode, grossesse prolongée', 'Usage court uniquement', 'Variable', 'Préparation préopératoire du Basedow ; jamais en traitement de fond.'),
  ('MED-HC', 'Hydrocortisone', 'Glucocorticoïde de substitution', 'Cp 10 mg (sécable)', 'Orale', '15–25 mg/j fractionnés : 10 mg au réveil, 5 mg à midi, 5 mg vers 16 h.', '30 mg/j hors situation de stress', 'Pas d''adaptation', 'Clinique (poids, PA, asthénie), ionogramme ; le cortisol n''a pas d''intérêt pour le suivi', 'Aucune en situation de substitution vitale', 'Poursuivre, majorer de 20–40 % au 3e trimestre', 'Courante', 'RÈGLES DES JOURS DE MALADIE : doubler ou tripler la dose si fièvre > 38 °C, infection ou chirurgie. Carte d''insuffisant surrénalien + trousse d''urgence obligatoires.'),
  ('MED-FLUDRO', 'Fludrocortisone', 'Minéralocorticoïde', 'Cp 50 µg', 'Orale', '50–200 µg/j en 1 prise le matin.', '300 µg/j', 'Pas d''adaptation', 'Pression artérielle debout/couché, kaliémie, natrémie, rénine', 'Œdèmes, HTA non contrôlée, insuffisance cardiaque', 'Poursuivre', 'Variable', 'Uniquement dans l''insuffisance surrénale primaire (Addison), pas dans l''insuffisance corticotrope. Ne pas restreindre le sel.'),
  ('MED-HCINJ', 'Hydrocortisone hémisuccinate', 'Glucocorticoïde injectable', 'Poudre inj. 100 mg', 'IV / IM', 'Crise surrénale : 100 mg IV ou IM en bolus, puis 100–200 mg/24 h en perfusion continue ou 50 mg/6 h.', null, 'Pas d''adaptation', 'Glycémie, ionogramme, PA', 'Aucune en urgence vitale', 'Poursuivre', 'Courante', 'L''injection ne doit JAMAIS être retardée par l''attente d''un dosage de cortisol.'),
  ('MED-DEXA', 'Dexaméthasone', 'Glucocorticoïde de synthèse', 'Cp 0,5 mg ; sol. inj. 4 mg/mL', 'Orale / IV', 'Test de freinage minute : 1 mg per os à 23 h. Bloc en 21-hydroxylase : 0,25–0,5 mg au coucher.', 'Selon indication', 'Pas d''adaptation', 'Cortisol à 8 h (test), glycémie', 'Infection non contrôlée pour un usage prolongé', 'Éviter en usage chronique', 'Courante', 'N''interfère pas avec le dosage du cortisol : molécule à utiliser pour les tests dynamiques.'),
  ('MED-SPIRO', 'Spironolactone', 'Antagoniste des récepteurs minéralocorticoïdes', 'Cp 25, 50, 75 mg', 'Orale', 'Hyperaldostéronisme primaire : 25 mg/j, titrer jusqu''à 50–100 mg/j. Hirsutisme/SOPK : 50–100 mg/j.', '200 mg/j', 'Contre-indiqué si DFG < 30 mL/min', 'Kaliémie et créatininémie à J7–J15, puis tous les 3–6 mois', 'Hyperkaliémie, insuffisance rénale sévère, association aux autres épargneurs de potassium', 'Contre-indiquée (féminisation fœtale) : contraception obligatoire', 'Courante', 'Gynécomastie dose-dépendante chez l''homme : préférer l''éplérénone si disponible.'),
  ('MED-DOXA', 'Doxazosine', 'Alpha-1 bloquant', 'Cp LP 4 mg, cp 1–2 mg', 'Orale', 'Préparation d''un phéochromocytome : 2 mg/j, augmenter progressivement jusqu''à 8–16 mg/j pendant 10–14 jours avant la chirurgie.', '16 mg/j', 'Pas d''adaptation', 'PA couché/debout, fréquence cardiaque', 'Hypotension orthostatique sévère', 'À évaluer', 'Variable', 'Alpha-blocage TOUJOURS avant tout bêtabloquant (risque de crise hypertensive). Régime riche en sel et hydratation associés.'),
  ('MED-CABER', 'Cabergoline', 'Agoniste dopaminergique', 'Cp 0,5 mg', 'Orale', '0,25–0,5 mg 1 à 2 fois par semaine, augmenter par paliers mensuels selon la prolactine.', '3,5 mg/semaine (usuel)', 'Pas d''adaptation', 'Prolactine à 1 mois puis tous les 3–6 mois ; IRM hypophysaire à 6–12 mois ; échographie cardiaque si dose > 2 mg/semaine', 'Valvulopathie, psychose non contrôlée, HTA non contrôlée', 'Arrêt habituel dès le diagnostic de grossesse (microadénome)', 'Variable', 'Prise au repas, le soir, pour limiter nausées et hypotension. Meilleure tolérance que la bromocriptine.'),
  ('MED-BROMO', 'Bromocriptine', 'Agoniste dopaminergique', 'Cp 2,5 mg', 'Orale', '1,25 mg le soir pendant 1 semaine, puis 2,5 mg/j, jusqu''à 2,5–7,5 mg/j en 2–3 prises.', '15 mg/j', 'Pas d''adaptation', 'Prolactine à 1 mois puis tous les 3–6 mois', 'HTA non contrôlée, coronaropathie, psychose', 'Molécule la mieux documentée en cas de désir de grossesse', 'Courante', 'Alternative économique à la cabergoline, largement disponible ; tolérance digestive moindre.'),
  ('MED-DESMO', 'Desmopressine', 'Analogue de la vasopressine', 'Cp 0,1 et 0,2 mg ; spray nasal 10 µg/dose', 'Orale / Nasale', 'Diabète insipide central : 0,1 mg × 2 à 3/j per os (ou 10–20 µg intranasal × 1–2/j), titration sur la diurèse et la natrémie.', '1,2 mg/j per os', 'Prudence', 'Natrémie à J3–J7 puis régulièrement, diurèse des 24 h, poids', 'Hyponatrémie, potomanie, insuffisance cardiaque', 'Possible sous surveillance', 'Variable', 'RISQUE PRINCIPAL : hyponatrémie de dilution. Prévoir une fenêtre thérapeutique quotidienne permettant une reprise de la diurèse.'),
  ('MED-METF', 'Metformine', 'Biguanide', 'Cp 500, 850, 1000 mg (et formes LP)', 'Orale', '500 mg × 1–2/j au milieu des repas, augmenter par paliers de 7–15 jours jusqu''à 1000 mg × 2/j.', '3000 mg/j (usuel 2000 mg/j)', 'DFG 45–59 : surveiller ; 30–44 : réduire de moitié (max 1000 mg/j) ; < 30 : contre-indiquée', 'HbA1c/3 mois, créatininémie et DFG 1–2 fois/an, vitamine B12 tous les 2–3 ans', 'DFG < 30, acidose métabolique, insuffisance hépatique ou cardiaque décompensée, déshydratation', 'Utilisable, souvent relayée par l''insuline', 'Courante', 'Traitement de 1re intention du diabète de type 2. À suspendre 48 h avant toute injection de produit de contraste iodé et toute chirurgie.'),
  ('MED-GLICLA', 'Gliclazide', 'Sulfamide hypoglycémiant', 'Cp LM 30 et 60 mg, cp 80 mg', 'Orale', 'LM 30 mg/j au petit-déjeuner, titrer par paliers de 4 semaines jusqu''à 120 mg/j.', '120 mg/j (forme LM)', 'Prudence si DFG < 60 ; éviter si DFG < 30', 'HbA1c/3 mois, autosurveillance glycémique, poids', 'Diabète de type 1, insuffisance rénale ou hépatique sévère, grossesse', 'Contre-indiqué : relais par insuline', 'Courante', 'Sulfamide au moindre risque hypoglycémique. Éducation obligatoire au resucrage et à la conduite à tenir en cas de jeûne (dont le Ramadan).'),
  ('MED-GLIBEN', 'Glibenclamide', 'Sulfamide hypoglycémiant', 'Cp 5 mg', 'Orale', '2,5–5 mg/j au petit-déjeuner, jusqu''à 15 mg/j en 2–3 prises.', '15 mg/j', 'À éviter dès DFG < 60', 'HbA1c/3 mois, glycémies capillaires', 'Sujet âgé, insuffisance rénale, diabète de type 1', 'Contre-indiqué', 'Courante', 'Hypoglycémies sévères et prolongées : préférer le gliclazide ou le glimépiride quand ils sont disponibles.'),
  ('MED-GLIMEP', 'Glimépiride', 'Sulfamide hypoglycémiant', 'Cp 1, 2, 3, 4 mg', 'Orale', '1 mg/j au petit-déjeuner, titrer par paliers de 1 mg toutes les 1–2 semaines.', '6 mg/j', 'Prudence ; éviter si DFG < 30', 'HbA1c/3 mois, glycémies capillaires', 'Diabète de type 1, insuffisance hépatique sévère', 'Contre-indiqué', 'Variable', 'Prise unique quotidienne.'),
  ('MED-SITA', 'Sitagliptine', 'Inhibiteur de la DPP-4', 'Cp 25, 50, 100 mg', 'Orale', '100 mg/j en 1 prise.', '100 mg/j', 'DFG 30–45 : 50 mg/j ; DFG < 30 : 25 mg/j', 'HbA1c/3 mois, DFG 1–2 fois/an', 'Hypersensibilité ; prudence si antécédent de pancréatite', 'Non recommandé', 'Variable', 'Neutre sur le poids, pas d''hypoglycémie en monothérapie. Coût élevé pour un patient non assuré.'),
  ('MED-VILDA', 'Vildagliptine', 'Inhibiteur de la DPP-4', 'Cp 50 mg', 'Orale', '50 mg × 2/j (50 mg/j si associée à un sulfamide).', '100 mg/j', 'DFG < 50 : 50 mg/j', 'HbA1c/3 mois, transaminases avant puis tous les 3 mois la 1re année', 'Insuffisance hépatique, ALAT > 3N', 'Non recommandé', 'Variable', null),
  ('MED-EMPA', 'Empagliflozine', 'Inhibiteur de SGLT2', 'Cp 10 et 25 mg', 'Orale', '10 mg/j le matin, éventuellement 25 mg/j.', '25 mg/j', 'Ne pas initier si DFG < 20 ; poursuivre ensuite sous surveillance', 'HbA1c/3 mois, DFG et RAC 1–2 fois/an, kaliémie', 'Acidocétose antérieure, infections génito-urinaires récidivantes, diabète de type 1 (hors avis spécialisé)', 'Contre-indiquée', 'Limitée', 'Bénéfice cardiaque et rénal démontré. ÉDUQUER : arrêter en cas de jeûne, de déshydratation, d''infection sévère ou avant une chirurgie (acidocétose euglycémique). Hygiène génitale renforcée, pertinente en climat chaud.'),
  ('MED-DAPA', 'Dapagliflozine', 'Inhibiteur de SGLT2', 'Cp 10 mg', 'Orale', '10 mg/j.', '10 mg/j', 'Ne pas initier si DFG < 25', 'HbA1c/3 mois, DFG, RAC', 'Idem empagliflozine', 'Contre-indiquée', 'Limitée', 'Mêmes précautions que l''empagliflozine.'),
  ('MED-ACARB', 'Acarbose', 'Inhibiteur des alpha-glucosidases', 'Cp 50 et 100 mg', 'Orale', '50 mg × 3/j au début des repas, jusqu''à 100 mg × 3/j.', '300 mg/j', 'Éviter si DFG < 25', 'HbA1c/3 mois, transaminases', 'Maladies inflammatoires intestinales, occlusion', 'Non recommandé', 'Variable', 'Agit sur la glycémie post-prandiale. Flatulences fréquentes. En cas d''hypoglycémie associée à un sulfamide, resucrer au GLUCOSE pur (le saccharose est inefficace).'),
  ('MED-PIO', 'Pioglitazone', 'Thiazolidinedione', 'Cp 15 et 30 mg', 'Orale', '15–30 mg/j.', '45 mg/j', 'Pas d''adaptation (éviter si dialysé)', 'HbA1c, transaminases, poids, œdèmes', 'Insuffisance cardiaque, cancer de la vessie, hématurie non explorée', 'Contre-indiquée', 'Limitée', 'Utile si insulinorésistance marquée ou stéatose métabolique. Prise de poids et œdèmes fréquents.'),
  ('MED-INSRAP', 'Insuline humaine rapide', 'Insuline d''action rapide', 'Flacon/cartouche 100 UI/mL', 'SC / IV', 'Bolus prandial : 0,05–0,1 UI/kg par repas, 30 min avant. Voie IV en acidocétose : 0,1 UI/kg/h.', 'Selon titration', 'Réduire les doses si DFG < 30', 'Glycémies capillaires 4–6 fois/j, HbA1c/3 mois, kaliémie en IV', 'Hypoglycémie', 'Utilisable (insuline de référence en grossesse)', 'Courante', 'Conservation : +2 à +8 °C avant ouverture, 28 jours à température ambiante (< 30 °C) après ouverture. En climat chaud, prévoir un dispositif de maintien au frais.'),
  ('MED-INSNPH', 'Insuline NPH (intermédiaire)', 'Insuline basale', 'Flacon/stylo 100 UI/mL', 'SC', 'Initiation dans le diabète de type 2 : 0,1–0,2 UI/kg au coucher, augmenter de 2 UI tous les 3 jours jusqu''à une glycémie à jeun de 0,80–1,30 g/L.', 'Selon titration', 'Réduire les doses si DFG < 30', 'Glycémie à jeun quotidienne, HbA1c/3 mois', 'Hypoglycémie', 'Utilisable', 'Courante', 'Remettre en suspension par 10 retournements avant injection. Option la plus économique.'),
  ('MED-INSMIX', 'Insuline prémélangée 30/70', 'Insuline biphasique', 'Stylo/flacon 100 UI/mL', 'SC', '0,3–0,5 UI/kg/j en 2 injections : 2/3 avant le petit-déjeuner, 1/3 avant le dîner.', 'Selon titration', 'Réduire si DFG < 30', 'Glycémies pré-prandiales, HbA1c/3 mois', 'Hypoglycémie', 'Utilisable', 'Courante', 'Schéma simple adapté à une faible fréquence d''autosurveillance ; exige des horaires de repas réguliers.'),
  ('MED-INSGLAR', 'Insuline glargine U100', 'Analogue lent', 'Stylo 100 UI/mL', 'SC', '0,1–0,2 UI/kg/j en 1 injection à heure fixe, titration de 2 UI tous les 3 jours.', 'Selon titration', 'Réduire si DFG < 30', 'Glycémie à jeun, HbA1c/3 mois', 'Hypoglycémie', 'Utilisable', 'Variable', 'Moins d''hypoglycémies nocturnes que la NPH. Ne jamais mélanger dans la même seringue.'),
  ('MED-INSASP', 'Insuline asparte ou lispro', 'Analogue rapide', 'Stylo 100 UI/mL', 'SC', 'Bolus prandial immédiatement avant le repas, adapté aux glucides et à la glycémie.', 'Selon titration', 'Réduire si DFG < 30', 'Glycémies pré- et post-prandiales, HbA1c/3 mois', 'Hypoglycémie', 'Utilisable', 'Variable', 'Schéma basal-bolus du diabète de type 1.'),
  ('MED-GLUCAGON', 'Glucagon', 'Hormone hyperglycémiante', 'Kit inj. 1 mg', 'IM / SC', 'Hypoglycémie sévère avec troubles de conscience : 1 mg IM (0,5 mg si < 25 kg), à renouveler après 10 min.', null, 'Pas d''adaptation', 'Glycémie capillaire après resucrage', 'Phéochromocytome, insulinome', 'Utilisable', 'Limitée', 'Former un proche à l''injection. Inefficace si réserves hépatiques épuisées (alcool, dénutrition).'),
  ('MED-ATOR', 'Atorvastatine', 'Statine', 'Cp 10, 20, 40, 80 mg', 'Orale', '10–20 mg/j en prévention primaire ; 40–80 mg/j en prévention secondaire ou haut risque.', '80 mg/j', 'Pas d''adaptation', 'Bilan lipidique et ALAT à 8–12 semaines puis 1 fois/an ; CK uniquement si myalgies', 'Hépatopathie évolutive, ALAT > 3N, grossesse', 'Contre-indiquée', 'Courante', 'Prise indifférente dans la journée. Interaction avec les macrolides et le jus de pamplemousse.'),
  ('MED-ROSU', 'Rosuvastatine', 'Statine', 'Cp 5, 10, 20 mg', 'Orale', '5–10 mg/j, jusqu''à 20 mg/j.', '40 mg/j (réservé au spécialiste)', 'Max 10 mg/j si DFG < 30', 'Bilan lipidique et ALAT à 8–12 semaines puis annuel', 'Hépatopathie évolutive, grossesse', 'Contre-indiquée', 'Variable', 'Statine la plus puissante à dose égale.'),
  ('MED-SIMVA', 'Simvastatine', 'Statine', 'Cp 20 et 40 mg', 'Orale', '20–40 mg/j le soir.', '40 mg/j', 'Prudence si DFG < 30', 'Bilan lipidique et ALAT à 8–12 semaines', 'Hépatopathie évolutive, grossesse, association à l''amiodarone à forte dose', 'Contre-indiquée', 'Courante', 'Option la plus économique. Ne pas dépasser 40 mg/j (risque musculaire).'),
  ('MED-FENO', 'Fénofibrate', 'Fibrate', 'Gél. 145, 160, 200 mg', 'Orale', '145–200 mg/j en 1 prise au cours du repas principal.', '200 mg/j', 'Réduire si DFG 30–60 ; contre-indiqué si DFG < 30', 'Triglycérides, créatininémie, ALAT, CK', 'Insuffisance rénale ou hépatique sévère, lithiase biliaire', 'Contre-indiqué', 'Courante', 'Indiqué si triglycérides > 5 mmol/L (risque de pancréatite). Association à une statine possible mais surveillance musculaire renforcée.'),
  ('MED-EZE', 'Ézétimibe', 'Inhibiteur de l''absorption du cholestérol', 'Cp 10 mg', 'Orale', '10 mg/j.', '10 mg/j', 'Pas d''adaptation', 'Bilan lipidique à 8–12 semaines', 'Hépatopathie active en association à une statine', 'Non recommandé', 'Variable', 'À ajouter quand la cible de LDL n''est pas atteinte sous statine à dose maximale tolérée (−20 % supplémentaires).'),
  ('MED-CHOLE', 'Cholécalciférol (vitamine D3)', 'Vitamine', 'Ampoule 100 000 UI ; gouttes 10 000 UI/mL', 'Orale', 'Carence : 100 000 UI tous les 15 jours × 4, puis entretien 100 000 UI tous les 2–3 mois (ou 800–1000 UI/j).', null, 'Prudence si insuffisance rénale sévère', '25-OH vitamine D à 3 mois, calcémie', 'Hypercalcémie, hypercalciurie, sarcoïdose', 'Recommandée', 'Courante', 'Corriger la carence AVANT tout bisphosphonate ou perfusion d''acide zolédronique.'),
  ('MED-CACO3', 'Carbonate de calcium (+ vitamine D3)', 'Supplément calcique', 'Cp/sachet 500 ou 1000 mg de calcium élément (± 400–880 UI de D3)', 'Orale', '500–1000 mg de calcium élément par jour en 1–2 prises, au cours des repas.', '1500 mg/j (apport total alimentaire inclus)', 'Prudence si DFG < 30', 'Calcémie, calciurie des 24 h', 'Hypercalcémie, hypercalciurie, lithiase calcique', 'Utilisable', 'Courante', 'Éloigner de 4 h de la lévothyroxine, des bisphosphonates, du fer et des cyclines.'),
  ('MED-ALEN', 'Alendronate', 'Bisphosphonate', 'Cp 70 mg', 'Orale', '70 mg une fois par semaine, à jeun.', '70 mg/semaine', 'Contre-indiqué si DFG < 35', 'DXA à 2 ans, calcémie, 25-OH vitamine D, créatininémie', 'Œsophagite, achalasie, impossibilité de rester en position verticale 30 min, hypocalcémie non corrigée', 'Contre-indiqué', 'Variable', 'PRISE : au lever, à jeun, avec un grand verre d''eau plate, rester debout ou assis 30 min sans autre prise. Bilan dentaire avant traitement. Durée 5 ans puis réévaluation.'),
  ('MED-RISE', 'Risédronate', 'Bisphosphonate', 'Cp 35 mg (hebdomadaire) ou 5 mg/j', 'Orale', '35 mg une fois par semaine.', '35 mg/semaine', 'Contre-indiqué si DFG < 30', 'DXA à 2 ans, calcémie, 25-OH vitamine D', 'Idem alendronate', 'Contre-indiqué', 'Variable', 'Mêmes modalités de prise que l''alendronate.'),
  ('MED-ZOLE', 'Acide zolédronique', 'Bisphosphonate injectable', 'Perfusion 5 mg/100 mL', 'IV', '5 mg en perfusion de 15–30 min, une fois par an.', '5 mg/an', 'Contre-indiqué si DFG < 35', 'Calcémie et 25-OH vitamine D avant chaque perfusion, créatininémie, DXA à 2–3 ans', 'Hypocalcémie, DFG < 35, soins dentaires invasifs en cours', 'Contre-indiqué', 'Limitée', 'Hydratation de 500 mL avant la perfusion. Syndrome pseudo-grippal fréquent à la 1re injection (paracétamol préventif). Bilan bucco-dentaire obligatoire.'),
  ('MED-CALCITRIOL', 'Calcitriol (ou alfacalcidol)', 'Vitamine D active', 'Gél. 0,25 et 0,5 µg', 'Orale', 'Hypoparathyroïdie : 0,25 µg × 2/j, titrer jusqu''à 0,5–2 µg/j.', '3 µg/j', 'Surveillance rapprochée', 'Calcémie et calciurie des 24 h toutes les 1–2 semaines en phase de titration, puis tous les 3–6 mois', 'Hypercalcémie', 'Utilisable sous surveillance', 'Variable', 'Cible : calcémie à la limite inférieure de la normale, sans hypercalciurie.'),
  ('MED-TESTOE', 'Testostérone énanthate', 'Androgène', 'Ampoule 250 mg/mL', 'IM profonde', '250 mg toutes les 3 à 4 semaines.', '250 mg/3 semaines', 'Prudence', 'Testostérone résiduelle, hématocrite et PSA avant puis à 3, 6 et 12 mois', 'Cancer de la prostate ou du sein, polyglobulie (Ht > 54 %), désir de paternité immédiat, apnée du sommeil sévère', 'Contre-indiquée', 'Courante', 'Variations importantes entre deux injections. Arrêter si l''hématocrite dépasse 54 %.'),
  ('MED-TESTOU', 'Testostérone undécanoate', 'Androgène retard', 'Ampoule 1000 mg/4 mL', 'IM profonde', '1000 mg, puis 1000 mg à 6 semaines, puis toutes les 10–14 semaines.', '1000 mg/10 semaines', 'Prudence', 'Testostérone résiduelle, hématocrite, PSA', 'Idem énanthate', 'Contre-indiquée', 'Limitée', 'Taux plus stables mais coût nettement supérieur.'),
  ('MED-ESTRA', 'Estradiol (± progestatif)', 'Œstrogène', 'Gel 0,5–1 mg/dose ; cp 1–2 mg ; patch 25–100 µg/24 h', 'Transdermique / Orale', 'Traitement hormonal de la ménopause : dose minimale efficace, voie transdermique privilégiée.', 'Selon symptômes', 'Pas d''adaptation', 'Pression artérielle, bilan lipidique, mammographie et frottis à jour', 'Cancer du sein ou de l''endomètre, antécédent thromboembolique, hépatopathie sévère, AVC', 'Contre-indiqué', 'Variable', 'Tout utérus en place impose l''association d''un progestatif (protection endométriale). Réévaluation annuelle du rapport bénéfice/risque.'),
  ('MED-PROGMIC', 'Progestérone micronisée', 'Progestatif', 'Gél. 100 et 200 mg', 'Orale / Vaginale', '200 mg/j au coucher, 12 à 14 jours par mois (insuffisance lutéale, protection endométriale).', '300 mg/j', 'Pas d''adaptation', 'Cycle menstruel, échographie endométriale si saignements', 'Thrombophlébite, hépatopathie sévère', 'Utilisable (voie vaginale)', 'Courante', 'Somnolence : prise vespérale.'),
  ('MED-DYDRO', 'Dydrogestérone', 'Progestatif', 'Cp 10 mg', 'Orale', '10 mg × 1–2/j, 10 à 14 jours par cycle.', '20 mg/j', 'Pas d''adaptation', 'Régularité du cycle', 'Hépatopathie sévère', 'Utilisable', 'Courante', null),
  ('MED-CLOMI', 'Citrate de clomifène', 'Inducteur de l''ovulation', 'Cp 50 mg', 'Orale', '50 mg/j de J2 à J6 du cycle, 5 jours. Augmenter à 100 puis 150 mg/j en l''absence d''ovulation.', '150 mg/j, 6 cycles maximum', 'Pas d''adaptation', 'Progestérone à J21 (confirmation de l''ovulation), échographie folliculaire', 'Grossesse, kyste ovarien, hépatopathie, tumeur hypophysaire non explorée', 'Arrêter dès la conception', 'Courante', 'Écarter une hyperprolactinémie et une dysthyroïdie avant l''induction. Risque de grossesse multiple.'),
  ('MED-CYPRO', 'Acétate de cyprotérone', 'Anti-androgène', 'Cp 50 mg ; associations œstroprogestatives 2 mg', 'Orale', 'Hirsutisme majeur : 50 mg/j 20 jours par mois, associé à un œstrogène.', '50 mg/j', 'Prudence', 'Transaminases, bilan lipidique ; IRM cérébrale si usage prolongé à forte dose', 'Hépatopathie, méningiome, antécédent thromboembolique', 'Contre-indiqué', 'Variable', 'Risque de méningiome dose- et durée-dépendant : limiter la durée et la dose cumulée, information écrite du patient.'),
  ('MED-ALLO', 'Allopurinol', 'Inhibiteur de la xanthine oxydase', 'Cp 100 et 300 mg', 'Orale', '100 mg/j, augmenter de 100 mg toutes les 2–4 semaines jusqu''à une uricémie < 360 µmol/L.', '900 mg/j', 'Débuter à 50–100 mg/j et titrer lentement si DFG < 60', 'Uricémie tous les mois en phase de titration, puis tous les 6 mois ; créatininémie ; NFS', 'Hypersensibilité antérieure (DRESS, Lyell)', 'À éviter', 'Courante', 'Ne jamais débuter pendant une crise aiguë. Couvrir les 3–6 premiers mois par la colchicine. Tout rash impose l''arrêt immédiat.'),
  ('MED-COLCHI', 'Colchicine', 'Anti-inflammatoire spécifique de la goutte', 'Cp 1 mg', 'Orale', 'Crise : 1 mg d''emblée, puis 0,5 mg une heure après (max 2 mg à J1), puis 0,5 mg × 2–3/j. Prophylaxie : 0,5 mg/j.', '2 mg/j à J1 puis 1,5 mg/j', 'Réduire de moitié si DFG 30–60 ; contre-indiquée si DFG < 30', 'Diarrhée (premier signe de surdosage), NFS, créatininémie', 'Insuffisance rénale ou hépatique sévère, association aux macrolides, à la ciclosporine ou au vérapamil', 'Utilisable avec prudence', 'Courante', 'MARGE THÉRAPEUTIQUE ÉTROITE. La diarrhée impose l''arrêt immédiat. Interactions médicamenteuses potentiellement mortelles.'),
  ('MED-ORLI', 'Orlistat', 'Inhibiteur des lipases digestives', 'Gél. 120 mg', 'Orale', '120 mg × 3/j au moment des repas contenant des lipides.', '360 mg/j', 'Pas d''adaptation', 'Poids, bilan lipidique, vitamines liposolubles si usage prolongé', 'Syndrome de malabsorption, cholestase', 'Contre-indiqué', 'Variable', 'Efficacité modeste (−3 kg), stéatorrhée fréquente. Supplémentation en vitamines A, D, E, K à distance de la prise.'),
  ('MED-LIRA', 'Liraglutide', 'Analogue du GLP-1', 'Stylo 6 mg/mL', 'SC', 'Diabète : 0,6 mg/j pendant 1 semaine, puis 1,2 mg/j, éventuellement 1,8 mg/j. Obésité : jusqu''à 3 mg/j.', '1,8 mg/j (diabète) ; 3 mg/j (obésité)', 'Pas d''adaptation jusqu''à DFG 15', 'HbA1c/3 mois, poids, tolérance digestive', 'Antécédent personnel ou familial de carcinome médullaire thyroïdien, NEM2, pancréatite', 'Contre-indiqué', 'Limitée', 'Chaîne du froid nécessaire, coût très élevé : accessibilité restreinte. Titration lente pour limiter les nausées.'),
  ('MED-KCL', 'Chlorure de potassium', 'Supplément potassique', 'Cp/gél. LP 600 mg (8 mmol de K+)', 'Orale', 'Hypokaliémie modérée : 2 à 6 gélules par jour réparties, au cours des repas.', 'Selon kaliémie', 'Contre-indiqué si insuffisance rénale sévère', 'Kaliémie à 48–72 h, ECG si K+ < 3,0 mmol/L', 'Hyperkaliémie, insuffisance rénale sévère', 'Utilisable', 'Courante', 'Corriger conjointement une hypomagnésémie, sinon l''hypokaliémie persiste.'),
  ('MED-B12', 'Vitamine B12 (cyanocobalamine)', 'Vitamine', 'Ampoule buvable ou inj. 1000 µg ; cp 1000 µg', 'Orale / IM', 'Carence : 1000 µg/j per os pendant 1 mois, puis entretien. Forme injectable : 1000 µg/j × 7 j, puis 1/semaine × 4, puis 1/mois.', null, 'Pas d''adaptation', 'Vitamine B12 à 3 mois, NFS', 'Aucune', 'Utilisable', 'Courante', 'Dépister la carence chez tout patient sous metformine au long cours avec neuropathie ou anémie.'),
  ('MED-FOL', 'Acide folique', 'Vitamine B9', 'Cp 5 mg ; cp 0,4 mg', 'Orale', 'Carence : 5 mg/j pendant 1–4 mois. Préconception : 0,4 mg/j (5 mg/j si diabète) 1 mois avant et 2 mois après la conception.', '5 mg/j', 'Pas d''adaptation', 'Folates, NFS', 'Anémie par carence en B12 non corrigée (à traiter d''abord)', 'Recommandé', 'Courante', 'Chez la diabétique, préconception à 5 mg/j en raison du surrisque de malformations du tube neural.'),
  ('MED-FER', 'Sulfate ferreux', 'Supplément martial', 'Cp 200 mg (65 mg de fer élément)', 'Orale', '1 à 2 cp/j à distance des repas, pendant 3 mois après normalisation de l''hémoglobine.', '200 mg de fer élément/j', 'Pas d''adaptation', 'Ferritine et NFS à 3 mois', 'Hémochromatose, surcharge martiale', 'Utilisable', 'Courante', 'Éloigner de 4 h de la lévothyroxine, du calcium et des cyclines. Prise avec de la vitamine C, jamais avec du thé.'),
  ('MED-RAMI', 'Ramipril', 'Inhibiteur de l''enzyme de conversion', 'Cp 1,25, 2,5, 5, 10 mg', 'Orale', '2,5 mg/j, doubler toutes les 2–4 semaines jusqu''à 10 mg/j.', '10 mg/j', 'Réduire si DFG < 30 ; surveillance rapprochée', 'Créatininémie et kaliémie à J7–J15 après chaque augmentation, RAC 1–2 fois/an, PA', 'Grossesse, sténose bilatérale des artères rénales, angio-œdème antérieur, hyperkaliémie', 'CONTRE-INDIQUÉ : arrêter dès le projet de grossesse', 'Courante', 'Néphroprotection dès une albuminurie confirmée, même sans HTA. Une hausse de la créatininémie < 30 % est acceptable.'),
  ('MED-PERIN', 'Périndopril', 'Inhibiteur de l''enzyme de conversion', 'Cp 4, 5, 8, 10 mg', 'Orale', '4–5 mg/j le matin, jusqu''à 8–10 mg/j.', '10 mg/j', 'Réduire si DFG < 60', 'Créatininémie, kaliémie, PA', 'Idem ramipril', 'Contre-indiqué', 'Courante', null),
  ('MED-LOSAR', 'Losartan', 'Antagoniste des récepteurs de l''angiotensine II', 'Cp 50 et 100 mg', 'Orale', '50 mg/j, jusqu''à 100 mg/j.', '100 mg/j', 'Prudence si DFG < 30', 'Créatininémie, kaliémie, RAC, PA', 'Grossesse, hyperkaliémie, sténose bilatérale des artères rénales', 'Contre-indiqué', 'Courante', 'Alternative en cas de toux sous IEC. Jamais d''association IEC + ARA2. Effet uricosurique accessoire utile chez le goutteux.'),
  ('MED-AMLO', 'Amlodipine', 'Inhibiteur calcique', 'Cp 5 et 10 mg', 'Orale', '5 mg/j, jusqu''à 10 mg/j.', '10 mg/j', 'Pas d''adaptation', 'PA, œdèmes des membres inférieurs', 'Choc cardiogénique, sténose aortique serrée', 'Utilisable (nicardipine préférée)', 'Courante', 'Souvent nécessaire en association chez le diabétique hypertendu.'),
  ('MED-HCTZ', 'Hydrochlorothiazide / Indapamide', 'Diurétique thiazidique', 'Cp HCTZ 12,5–25 mg ; indapamide 1,5 mg LP', 'Orale', '12,5–25 mg/j (ou indapamide 1,5 mg/j).', '25 mg/j', 'Inefficace si DFG < 30 : passer au furosémide', 'Kaliémie, natrémie, uricémie, glycémie à 1 mois', 'Hypokaliémie, goutte, hyponatrémie', 'À éviter', 'Courante', 'Peut majorer la glycémie et l''uricémie : surveiller chez le diabétique goutteux.'),
  ('MED-ASPI', 'Acide acétylsalicylique', 'Antiagrégant plaquettaire', 'Cp 75 ou 100 mg', 'Orale', '75–100 mg/j en prévention secondaire.', '100 mg/j', 'Prudence si DFG < 30', 'Signes hémorragiques, hémoglobine', 'Ulcère évolutif, allergie aux salicylés, hémorragie active', 'Déconseillé au 3e trimestre', 'Courante', 'Pas d''indication systématique en prévention primaire chez le diabétique.');

-- ---------------------------------------------------------------------
--  ORDONNANCES TYPES
-- ---------------------------------------------------------------------
create table ordonnances_types (
  code       text primary key,
  nom        text not null,
  indication text,
  contexte   text,
  conseils   text
);

create table ordonnance_type_lignes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null references ordonnances_types(code) on delete cascade,
  numero       int,
  prescription text not null,
  posologie    text,
  duree        text,
  consigne     text
);
create index idx_ord_type_lignes on ordonnance_type_lignes (code);

create table ordonnance_type_suivi (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references ordonnances_types(code) on delete cascade,
  code_examen text,
  examen      text not null,
  periodicite text
);
create index idx_ord_type_suivi on ordonnance_type_suivi (code);

insert into ordonnances_types (code, nom, indication, contexte, conseils) values
  ('ORD-HYPO-ADULTE', 'Hypothyroïdie primaire — adulte jeune', 'TSH élevée avec T4L basse, hors coronaropathie', 'Initiation en ambulatoire', 'Expliquer que le traitement est à vie. Éloigner de 4 h le fer, le calcium, les IPP et les antiacides. Ne pas changer de spécialité sans recontrôle de la TSH.'),
  ('ORD-HYPO-AGE', 'Hypothyroïdie — sujet âgé ou coronarien', 'Hypothyroïdie avec cardiopathie ischémique ou âge > 65 ans', 'Titration prudente', 'Cible de TSH tolérée plus haute chez le sujet très âgé (jusqu''à 6 mUI/L). Un ECG de référence est utile avant l''initiation.'),
  ('ORD-BASEDOW', 'Hyperthyroïdie de Basedow — traitement d''attaque', 'Thyrotoxicose avec TRAK positifs', 'Traitement médical de 12 à 18 mois', 'Remettre une consigne écrite sur le risque d''agranulocytose. Contraception recommandée pendant la phase d''attaque.'),
  ('ORD-THYROIDECT', 'Suivi après thyroïdectomie totale', 'Hypothyroïdie post-chirurgicale, risque d''hypoparathyroïdie', 'Post-opératoire', 'Toute paresthésie ou crampe impose un dosage de la calcémie en urgence.'),
  ('ORD-DT2-1L', 'Diabète de type 2 — première ligne', 'Diabète de type 2 nouvellement diagnostiqué', 'Ambulatoire, DFG > 45 mL/min', 'Suspendre la metformine 48 h avant toute injection de produit de contraste iodé, toute chirurgie ou en cas de déshydratation. Examen annuel des pieds et fond d''œil.'),
  ('ORD-DT2-BI', 'Diabète de type 2 — bithérapie avec atteinte rénale ou cardiaque', 'HbA1c au-dessus de la cible sous metformine, avec albuminurie ou maladie cardiovasculaire', 'DFG > 25 mL/min', 'Sous iSGLT2 : éducation à l''hygiène génitale et signalement de toute mycose. Une baisse initiale du DFG de 10 à 15 % est attendue et ne justifie pas l''arrêt. Si l''empagliflozine est indisponible ou trop coûteuse, privilégier sulfamide ou DPP-4 selon le profil.'),
  ('ORD-DT2-SU', 'Diabète de type 2 — association metformine + sulfamide', 'HbA1c au-dessus de la cible sous metformine seule, contrainte de coût', 'Option la plus accessible économiquement', 'Éducation au resucrage : 15 g de glucose (3 morceaux de sucre), recontrôle à 15 minutes. Adapter ou suspendre le sulfamide en période de jeûne, notamment pendant le Ramadan.'),
  ('ORD-DT2-INS', 'Diabète de type 2 — passage à l''insuline basale', 'HbA1c > 9 % ou échec des antidiabétiques oraux', 'Initiation ambulatoire encadrée', 'Conservation de l''insuline : réfrigérateur entre +2 et +8 °C, jamais au congélateur ; 28 jours à température ambiante après ouverture, à conserver à l''abri de la chaleur. Arrêter le sulfamide lors du passage à un schéma basal-bolus.'),
  ('ORD-DT1', 'Diabète de type 1 — schéma basal-bolus', 'Diabète de type 1 confirmé', 'Prise en charge spécialisée', 'Règles des jours de maladie : ne jamais arrêter l''insuline basale, augmenter l''autosurveillance, rechercher les cétones, s''hydrater. Consulter en urgence si vomissements ou cétose.'),
  ('ORD-ACIDOCETOSE', 'Acidocétose diabétique — prise en charge initiale', 'Hyperglycémie avec cétose et acidose', 'URGENCE HOSPITALIÈRE — protocole de référence, adaptation au protocole du service', 'Rechercher systématiquement le facteur déclenchant : infection, arrêt de l''insuline, syndrome coronarien, iSGLT2 (acidocétose possible avec une glycémie normale).'),
  ('ORD-DG', 'Diabète gestationnel', 'Hyperglycémie découverte pendant la grossesse', 'Suivi conjoint obstétrical et diabétologique', 'Les antidiabétiques oraux ne sont pas recommandés en 1re intention. Risque ultérieur de diabète de type 2 : dépistage glycémique tous les 1 à 3 ans à vie.'),
  ('ORD-NEPHRO-DIAB', 'Néphroprotection du diabétique', 'Rapport albumine/créatinine supérieur à 3 mg/mmol confirmé sur 2 prélèvements', 'Quel que soit le niveau de pression artérielle', 'Cible de pression artérielle inférieure à 130/80 mmHg. Restriction sodée à moins de 5 g de sel par jour. Proscrire les AINS.'),
  ('ORD-DYSLIP-2', 'Dyslipidémie — prévention secondaire', 'Antécédent d''événement cardiovasculaire ou très haut risque', 'Cible de LDL inférieure à 1,4 mmol/L (0,55 g/L)', 'Ne jamais arrêter une statine sur des myalgies isolées sans dosage de CK : réévaluer, réduire la dose ou changer de molécule.'),
  ('ORD-DYSLIP-1', 'Dyslipidémie — prévention primaire à risque élevé', 'Diabétique de plus de 40 ans ou risque cardiovasculaire élevé', 'Cible de LDL inférieure à 1,8 mmol/L (0,70 g/L)', 'Réévaluer le risque cardiovasculaire global et le tabagisme à chaque consultation.'),
  ('ORD-HYPERTG', 'Hypertriglycéridémie majeure', 'Triglycérides supérieurs à 5 mmol/L (4,5 g/L)', 'Prévention de la pancréatite aiguë', 'Au-delà de 10 mmol/L, le risque de pancréatite aiguë est majeur : prise en charge urgente, jeûne lipidique strict.'),
  ('ORD-OSTEO', 'Ostéoporose post-ménopausique', 'T-score inférieur ou égal à -2,5 DS ou fracture de fragilité', 'Après correction d''une carence en vitamine D', 'Bilan bucco-dentaire avant l''initiation (risque d''ostéonécrose de la mâchoire). Prévention des chutes, apport protidique suffisant, exposition solaire raisonnée.'),
  ('ORD-CARENCE-D', 'Carence en vitamine D', '25-OH vitamine D inférieure à 50 nmol/L (20 ng/mL)', 'Correction puis entretien', 'Rechercher une malabsorption si la carence est profonde ou récidivante. Ne pas doser la vitamine D de façon répétée chez un patient bien substitué.'),
  ('ORD-HYPOPARA', 'Hypoparathyroïdie post-chirurgicale', 'Hypocalcémie avec PTH basse après thyroïdectomie', 'Substitution à vie ou transitoire', 'Cible : calcémie à la limite basse de la normale, sans hypercalciurie (risque de néphrocalcinose). Consulter en urgence en cas de paresthésies ou de tétanie.'),
  ('ORD-ADDISON', 'Insuffisance surrénale primaire — traitement de fond', 'Maladie d''Addison confirmée', 'Substitution à vie', 'Carte d''insuffisant surrénalien à porter en permanence. Le dosage du cortisol n''est PAS utile au suivi. Jamais d''arrêt brutal.'),
  ('ORD-CRISE-SURR', 'Crise surrénale aiguë', 'Malaise, hypotension, vomissements chez un insuffisant surrénalien', 'URGENCE VITALE — ne pas attendre les résultats biologiques', 'Rechercher le facteur déclenchant : infection, oubli de traitement, chirurgie, gastro-entérite. La fludrocortisone est inutile tant que l''hydrocortisone est à forte dose.'),
  ('ORD-HAP', 'Hyperaldostéronisme primaire — traitement médical', 'Adénome bilatéral ou patient non opérable', 'Alternative à la surrénalectomie', 'Interrompre toute supplémentation potassique à l''introduction. Proscrire l''association aux autres épargneurs de potassium et aux AINS.'),
  ('ORD-PRLOME', 'Hyperprolactinémie — microprolactinome', 'Prolactine élevée avec microadénome hypophysaire', 'Après exclusion d''une macroprolactinémie, d''une grossesse, d''une hypothyroïdie et d''une cause médicamenteuse', 'Reprise de la fertilité fréquente et rapide : informer sur la contraception si une grossesse n''est pas souhaitée. Arrêt habituel du traitement en cas de grossesse sur microadénome.'),
  ('ORD-SOPK-CYCLE', 'SOPK — troubles du cycle et hirsutisme, sans désir de grossesse', 'Syndrome des ovaires polykystiques', 'Après exclusion d''un bloc en 21-hydroxylase et d''une hyperprolactinémie', 'Délai d''action de 6 mois sur la pilosité : associer les traitements cosmétiques et prévenir de la lenteur du résultat.'),
  ('ORD-SOPK-GROSS', 'SOPK — désir de grossesse', 'Anovulation avec désir de conception', 'Après bilan du couple', 'Arrêt du clomifène dès la conception. Informer du risque de grossesse multiple et de syndrome d''hyperstimulation.'),
  ('ORD-HYPOGONAD', 'Hypogonadisme masculin — substitution androgénique', 'Testostérone basse confirmée sur deux prélèvements matinaux avec symptômes', 'Après bilan étiologique (FSH, LH, prolactine, hémogramme)', 'La substitution supprime la spermatogenèse : contre-indiquée en cas de désir de paternité immédiat. Dépister une apnée du sommeil.'),
  ('ORD-DIC', 'Diabète insipide central', 'Syndrome polyuro-polydipsique avec test de restriction hydrique évocateur', 'Après confirmation diagnostique', 'Risque principal : hyponatrémie de dilution. Consulter en urgence en cas de céphalées, nausées ou confusion.'),
  ('ORD-GOUTTE', 'Goutte — traitement de fond hypo-uricémiant', 'Goutte récidivante, tophacée ou avec lithiase urique', 'À distance de la crise aiguë', 'Ne pas interrompre l''allopurinol en cas de crise survenant sous traitement. Chez l''hypertendu goutteux, le losartan est préférable au thiazidique.'),
  ('ORD-OBESITE', 'Obésité — prise en charge médicale', 'IMC ≥ 30 kg/m² ou ≥ 27 avec comorbidité', 'Traitement médicamenteux en complément des mesures hygiéno-diététiques', 'Rechercher systématiquement une cause secondaire (hypothyroïdie, Cushing, iatrogénie) et un trouble du comportement alimentaire avant toute prescription.'),
  ('ORD-CARENCE-B12', 'Carence en vitamine B12 sous metformine', 'Vitamine B12 basse chez un patient traité au long cours', 'Neuropathie ou anémie macrocytaire associée', 'Traiter la carence en B12 avant toute supplémentation en folates (risque d''aggravation neurologique).');
insert into ordonnance_type_lignes (code, numero, prescription, posologie, duree, consigne) values
  ('ORD-HYPO-ADULTE', 1.0, 'Lévothyroxine', '1,6 µg/kg/j, soit environ 100 µg/j pour 60 kg, 1 cp le matin', '3 mois renouvelables', 'À jeun, 30 min avant le petit-déjeuner, avec un verre d''eau'),
  ('ORD-HYPO-AGE', 1.0, 'Lévothyroxine', '12,5 à 25 µg/j, augmentation de 12,5 à 25 µg toutes les 4 à 6 semaines', 'Au long cours', 'Prise matinale à jeun ; consulter en cas de douleur thoracique ou de palpitations'),
  ('ORD-BASEDOW', 1.0, 'Carbimazole', '20 à 40 mg/j en 1 à 2 prises pendant 4 à 6 semaines, puis décroissance vers 5 à 15 mg/j', '12 à 18 mois', 'Arrêt immédiat et NFS en urgence en cas de fièvre ou d''angine'),
  ('ORD-BASEDOW', 2.0, 'Propranolol', '40 mg × 2 à 3/j', '4 à 6 semaines', 'À diminuer dès la régression des signes adrénergiques'),
  ('ORD-BASEDOW', 3.0, 'Repos et arrêt du tabac', null, null, 'Le tabac aggrave l''orbitopathie basedowienne'),
  ('ORD-THYROIDECT', 1.0, 'Lévothyroxine', '1,6 à 1,8 µg/kg/j (2 à 2,5 µg/kg/j si freination après cancer)', 'À vie', 'Prise matinale à jeun'),
  ('ORD-THYROIDECT', 2.0, 'Calcium + vitamine D3', '1000 mg de calcium élément par jour, à adapter à la calcémie', 'Selon évolution', 'Signaler fourmillements péribuccaux ou crampes'),
  ('ORD-DT2-1L', 1.0, 'Metformine', '500 mg × 1/j pendant 1 semaine, puis 500 mg × 2/j, puis 1000 mg × 2/j selon tolérance', '3 mois renouvelables', 'Au milieu ou à la fin des repas ; les troubles digestifs sont transitoires'),
  ('ORD-DT2-1L', 2.0, 'Mesures hygiéno-diététiques', 'Activité physique 150 min/semaine, réduction des sucres rapides et des boissons sucrées', 'Permanent', 'Objectif de perte de 5 à 10 % du poids si surpoids'),
  ('ORD-DT2-BI', 1.0, 'Metformine', '1000 mg × 2/j', 'Poursuite', 'Au cours des repas'),
  ('ORD-DT2-BI', 2.0, 'Empagliflozine', '10 mg/j le matin', '3 mois renouvelables', 'Arrêter en cas de jeûne prolongé, de vomissements, d''infection sévère ou avant une chirurgie'),
  ('ORD-DT2-BI', 3.0, 'Ramipril', '2,5 mg/j puis titration jusqu''à 10 mg/j', 'Au long cours', 'Si albuminurie ou HTA associée'),
  ('ORD-DT2-SU', 1.0, 'Metformine', '1000 mg × 2/j', 'Poursuite', 'Au cours des repas'),
  ('ORD-DT2-SU', 2.0, 'Gliclazide LM', '30 mg/j au petit-déjeuner, titration jusqu''à 120 mg/j', '3 mois renouvelables', 'Ne jamais sauter de repas ; resucrage à portée de main'),
  ('ORD-DT2-SU', 3.0, 'Lecteur de glycémie et bandelettes', 'Autosurveillance 2 à 3 fois par semaine en alternant les horaires', null, 'Carnet à présenter à chaque consultation'),
  ('ORD-DT2-INS', 1.0, 'Insuline NPH', '0,2 UI/kg au coucher, soit environ 12 UI, augmenter de 2 UI tous les 3 jours', 'Au long cours', 'Cible de glycémie à jeun : 0,80 à 1,30 g/L'),
  ('ORD-DT2-INS', 2.0, 'Metformine', '1000 mg × 2/j', 'Poursuite', 'À maintenir sauf contre-indication'),
  ('ORD-DT2-INS', 3.0, 'Matériel d''injection et autosurveillance', 'Stylos/seringues, aiguilles, lecteur, bandelettes, conteneur à aiguilles', null, 'Rotation des sites d''injection pour prévenir les lipodystrophies'),
  ('ORD-DT1', 1.0, 'Insuline glargine (ou NPH)', '0,25 UI/kg/j en 1 injection à heure fixe (50 % de la dose totale)', 'À vie', 'Ne jamais interrompre, même en cas de jeûne ou de maladie'),
  ('ORD-DT1', 2.0, 'Insuline asparte ou insuline rapide', '50 % de la dose totale répartis sur les 3 repas, adaptés aux glucides et à la glycémie', 'À vie', 'Injection immédiatement avant le repas'),
  ('ORD-DT1', 3.0, 'Glucagon (kit d''urgence)', '1 mg IM en cas d''hypoglycémie sévère', null, 'Former un proche à l''injection'),
  ('ORD-DT1', 4.0, 'Autosurveillance glycémique', '4 à 6 contrôles par jour, plus en cas de maladie', null, 'Bandelettes urinaires ou dosage des cétones si glycémie > 2,50 g/L'),
  ('ORD-ACIDOCETOSE', 1.0, 'Réhydratation', 'Sérum salé isotonique 0,9 % : 1 L la 1re heure, puis 500 mL/h en adaptant à l''état cardiaque', 'Phase aiguë', 'Passage au G5 % lorsque la glycémie descend sous 2,50 g/L'),
  ('ORD-ACIDOCETOSE', 2.0, 'Insuline rapide IV', '0,1 UI/kg/h au pousse-seringue électrique, sans bolus initial', 'Jusqu''à résolution de la cétose', 'Ne pas arrêter avant le relais sous-cutané, avec 1 à 2 h de chevauchement'),
  ('ORD-ACIDOCETOSE', 3.0, 'Potassium', 'Débuter dès que la kaliémie est inférieure à 5,0 mmol/L, sous surveillance ECG', 'Phase aiguë', 'Ne jamais débuter l''insuline si la kaliémie est inférieure à 3,3 mmol/L'),
  ('ORD-DG', 1.0, 'Diététique et activité physique', '3 repas et 2 collations, apport glucidique réparti, marche 30 min/j', 'Jusqu''à l''accouchement', 'Prise en charge de 1re intention pendant 7 à 10 jours'),
  ('ORD-DG', 2.0, 'Insuline NPH et/ou rapide', 'Introduite si les objectifs ne sont pas atteints après 10 jours de diététique', 'Jusqu''à l''accouchement', 'Objectifs : à jeun < 0,95 g/L et 2 h après le repas < 1,20 g/L'),
  ('ORD-DG', 3.0, 'Autosurveillance glycémique', '6 contrôles par jour (avant et 2 h après chaque repas)', 'Jusqu''à l''accouchement', 'Carnet de surveillance'),
  ('ORD-NEPHRO-DIAB', 1.0, 'Ramipril', '2,5 mg/j, titrer jusqu''à 10 mg/j selon la tolérance', 'Au long cours', 'Arrêt immédiat en cas de grossesse'),
  ('ORD-NEPHRO-DIAB', 2.0, 'Empagliflozine', '10 mg/j si DFG > 20 mL/min', 'Au long cours', 'Si accessible'),
  ('ORD-NEPHRO-DIAB', 3.0, 'Atorvastatine', '20 à 40 mg/j', 'Au long cours', 'Prise le soir'),
  ('ORD-DYSLIP-2', 1.0, 'Atorvastatine', '40 à 80 mg/j en 1 prise', 'Au long cours', 'Signaler toute douleur musculaire diffuse'),
  ('ORD-DYSLIP-2', 2.0, 'Ézétimibe', '10 mg/j, à ajouter si la cible n''est pas atteinte à 3 mois', 'Au long cours', null),
  ('ORD-DYSLIP-2', 3.0, 'Acide acétylsalicylique', '75 à 100 mg/j', 'Au long cours', 'Au cours d''un repas'),
  ('ORD-DYSLIP-1', 1.0, 'Atorvastatine', '10 à 20 mg/j', 'Au long cours', null),
  ('ORD-DYSLIP-1', 2.0, 'Mesures diététiques', 'Réduction des graisses saturées, huile végétale insaturée, 5 fruits et légumes par jour', 'Permanent', null),
  ('ORD-HYPERTG', 1.0, 'Fénofibrate', '145 à 200 mg/j au repas principal', '3 mois renouvelables', null),
  ('ORD-HYPERTG', 2.0, 'Arrêt total de l''alcool et des sucres rapides', null, 'Permanent', 'Facteur causal le plus fréquent avec le diabète déséquilibré'),
  ('ORD-OSTEO', 1.0, 'Cholécalciférol', '100 000 UI tous les 15 jours × 4, puis tous les 3 mois', 'Au long cours', 'À débuter AVANT le bisphosphonate'),
  ('ORD-OSTEO', 2.0, 'Calcium + vitamine D3', '500 à 1000 mg de calcium élément par jour selon les apports alimentaires', 'Au long cours', 'Au cours des repas'),
  ('ORD-OSTEO', 3.0, 'Alendronate', '70 mg une fois par semaine, le même jour', '5 ans puis réévaluation', 'Au lever, à jeun, grand verre d''eau plate, rester debout 30 min sans autre prise'),
  ('ORD-CARENCE-D', 1.0, 'Cholécalciférol', '100 000 UI par voie orale tous les 15 jours pendant 2 mois (4 ampoules), puis 100 000 UI tous les 3 mois', '6 mois renouvelables', 'Boire l''ampoule directement, au cours d''un repas'),
  ('ORD-HYPOPARA', 1.0, 'Calcitriol', '0,25 µg × 2/j, à adapter à la calcémie', 'Selon évolution', 'Ne jamais arrêter brutalement'),
  ('ORD-HYPOPARA', 2.0, 'Carbonate de calcium', '1000 mg de calcium élément par jour en 2 à 3 prises', 'Selon évolution', 'Au cours des repas'),
  ('ORD-ADDISON', 1.0, 'Hydrocortisone', '10 mg au réveil, 5 mg à midi, 5 mg vers 16 h', 'À vie', 'RÈGLE DES JOURS DE MALADIE : doubler ou tripler la dose si fièvre, infection ou stress'),
  ('ORD-ADDISON', 2.0, 'Fludrocortisone', '50 à 100 µg/j en 1 prise le matin', 'À vie', 'Ne pas restreindre le sel'),
  ('ORD-ADDISON', 3.0, 'Hydrocortisone hémisuccinate 100 mg injectable', 'Trousse d''urgence à domicile : 100 mg IM en cas de vomissements ou de malaise', null, 'Former le patient et un proche à l''injection'),
  ('ORD-CRISE-SURR', 1.0, 'Hydrocortisone hémisuccinate', '100 mg IV ou IM immédiatement, puis 100 à 200 mg/24 h en perfusion continue ou 50 mg/6 h', '48 à 72 h puis décroissance', 'L''injection prime sur tout prélèvement'),
  ('ORD-CRISE-SURR', 2.0, 'Réhydratation', 'Sérum salé isotonique 0,9 % : 1 L la 1re heure, puis selon l''hémodynamique', 'Phase aiguë', 'Ajouter du G5 % en cas d''hypoglycémie'),
  ('ORD-HAP', 1.0, 'Spironolactone', '25 mg/j, titrer jusqu''à 50 à 100 mg/j selon la kaliémie et la pression artérielle', 'Au long cours', 'Signaler gynécomastie ou troubles du cycle'),
  ('ORD-HAP', 2.0, 'Amlodipine', '5 à 10 mg/j si la cible tensionnelle n''est pas atteinte', 'Au long cours', null),
  ('ORD-HAP', 3.0, 'Régime hyposodé', 'Moins de 5 g de sel par jour', 'Permanent', 'Conditionne l''efficacité du traitement'),
  ('ORD-PRLOME', 1.0, 'Cabergoline', '0,25 mg deux fois par semaine, augmentation mensuelle selon la prolactine', 'Au long cours, réévaluation à 2 ans', 'Prise au repas du soir pour limiter les nausées'),
  ('ORD-PRLOME', 2.0, 'Bromocriptine (alternative)', '1,25 mg le soir pendant 1 semaine, puis 2,5 à 7,5 mg/j', 'Idem', 'Option économique et molécule de choix en cas de désir de grossesse'),
  ('ORD-SOPK-CYCLE', 1.0, 'Perte de poids et activité physique', 'Objectif de −5 à −10 % du poids si surpoids', 'Permanent', 'Mesure la plus efficace sur le cycle et l''ovulation'),
  ('ORD-SOPK-CYCLE', 2.0, 'Metformine', '500 mg × 2/j puis 1000 mg × 2/j si insulinorésistance', '6 mois renouvelables', 'Au cours des repas'),
  ('ORD-SOPK-CYCLE', 3.0, 'Progestérone micronisée', '200 mg/j, 12 jours par mois, si spanioménorrhée', '6 mois', 'Protection de l''endomètre'),
  ('ORD-SOPK-CYCLE', 4.0, 'Spironolactone', '50 à 100 mg/j en cas d''hirsutisme marqué', '12 mois minimum', 'CONTRACEPTION OBLIGATOIRE : tératogène'),
  ('ORD-SOPK-GROSS', 1.0, 'Perte de poids', '5 à 10 % du poids corporel', 'Avant l''induction', 'Restaure l''ovulation dans un nombre important de cas'),
  ('ORD-SOPK-GROSS', 2.0, 'Acide folique', '0,4 mg/j (5 mg/j si diabète ou obésité)', '1 mois avant et 2 mois après la conception', null),
  ('ORD-SOPK-GROSS', 3.0, 'Citrate de clomifène', '50 mg/j de J2 à J6, augmentation à 100 puis 150 mg/j selon la réponse', '6 cycles maximum', 'Surveillance échographique du nombre de follicules'),
  ('ORD-SOPK-GROSS', 4.0, 'Metformine', '1000 mg × 2/j en cas d''insulinorésistance associée', null, null),
  ('ORD-HYPOGONAD', 1.0, 'Testostérone énanthate', '250 mg en IM profonde toutes les 3 à 4 semaines', 'Au long cours', 'Prélever la testostérone juste avant l''injection suivante'),
  ('ORD-DIC', 1.0, 'Desmopressine', '0,1 mg × 2/j per os, titration sur la diurèse et la natrémie', 'Au long cours', 'Laisser une fenêtre quotidienne permettant une reprise de la diurèse'),
  ('ORD-DIC', 2.0, 'Accès libre à l''eau', null, 'Permanent', 'Ne jamais restreindre les boissons chez un patient conscient'),
  ('ORD-GOUTTE', 1.0, 'Allopurinol', '100 mg/j, augmentation de 100 mg toutes les 2 à 4 semaines jusqu''à une uricémie < 360 µmol/L', 'Au long cours', 'TOUT RASH IMPOSE L''ARRÊT IMMÉDIAT ET UNE CONSULTATION'),
  ('ORD-GOUTTE', 2.0, 'Colchicine', '0,5 mg/j en prophylaxie des crises', '3 à 6 premiers mois', 'La diarrhée impose l''arrêt immédiat'),
  ('ORD-GOUTTE', 3.0, 'Mesures diététiques', 'Réduction de l''alcool (bière), des abats, des fruits de mer et des boissons sucrées ; hydratation ≥ 2 L/j', 'Permanent', null),
  ('ORD-OBESITE', 1.0, 'Programme diététique et activité physique', 'Déficit de 500 kcal/j, 150 à 300 min d''activité par semaine', 'Permanent', 'Base indispensable de toute prise en charge'),
  ('ORD-OBESITE', 2.0, 'Orlistat', '120 mg × 3/j aux repas contenant des lipides', '3 à 6 mois, à réévaluer', 'Stéatorrhée si le repas est trop gras'),
  ('ORD-OBESITE', 3.0, 'Liraglutide (si accessible)', '0,6 mg/j pendant 1 semaine puis augmentation hebdomadaire jusqu''à 3 mg/j', 'Réévaluation à 3 mois', 'Arrêt si la perte de poids est inférieure à 5 % à 3 mois'),
  ('ORD-CARENCE-B12', 1.0, 'Vitamine B12', '1000 µg/j per os pendant 1 mois, puis 1000 µg/semaine pendant 1 mois, puis mensuel', '6 mois puis réévaluation', 'Poursuivre la metformine si elle reste indiquée');
insert into ordonnance_type_suivi (code, code_examen, examen, periodicite) values
  ('ORD-HYPO-ADULTE', 'THY-TSH', 'TSH', '6 à 8 semaines après l''initiation, puis à chaque changement de dose, puis 1 fois/an'),
  ('ORD-HYPO-ADULTE', 'THY-T4L', 'T4 libre', 'Uniquement si la TSH est discordante ou en cas d''origine hypophysaire'),
  ('ORD-HYPO-AGE', 'THY-TSH', 'TSH', 'Toutes les 6 semaines pendant la titration, puis tous les 6 à 12 mois'),
  ('ORD-BASEDOW', 'THY-T4L', 'T4 libre', 'Toutes les 4 à 6 semaines en phase d''attaque (la TSH reste freinée plusieurs mois)'),
  ('ORD-BASEDOW', 'THY-TSH', 'TSH', 'À partir du 3e mois, puis tous les 3 mois'),
  ('ORD-BASEDOW', 'THY-TRAK', 'Anticorps anti-récepteur de la TSH', 'À 6 mois puis en fin de traitement (valeur pronostique de rechute)'),
  ('ORD-BASEDOW', null, 'NFS et transaminases', 'Avant traitement, puis en urgence sur point d''appel clinique'),
  ('ORD-THYROIDECT', 'PCA-CAT', 'Calcium total', 'J1, J2, puis à 1 semaine et 1 mois'),
  ('ORD-THYROIDECT', 'PCA-PTH', 'PTH intacte', 'À 24 h post-opératoire puis à 6 mois si hypocalcémie persistante'),
  ('ORD-THYROIDECT', 'THY-TSH', 'TSH', '6 à 8 semaines après l''initiation puis tous les 6 à 12 mois'),
  ('ORD-THYROIDECT', 'THY-TG', 'Thyroglobuline', 'Suivi du cancer différencié, avec anticorps anti-Tg systématiques'),
  ('ORD-DT2-1L', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois jusqu''à la cible, puis tous les 6 mois'),
  ('ORD-DT2-1L', 'GLU-GAJ', 'Glycémie à jeun', 'Tous les 3 mois'),
  ('ORD-DT2-1L', 'GLU-CREAT', 'Créatininémie et DFG', '1 à 2 fois par an'),
  ('ORD-DT2-1L', 'GLU-RAC', 'Rapport albumine/créatinine urinaire', '1 fois par an'),
  ('ORD-DT2-1L', 'LIP-LDL', 'Bilan lipidique complet', '1 fois par an'),
  ('ORD-DT2-1L', 'MET-ALAT', 'Transaminases', '1 fois par an'),
  ('ORD-DT2-BI', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois'),
  ('ORD-DT2-BI', 'GLU-DFG', 'DFG estimé', 'À 1 mois après l''initiation, puis tous les 6 mois'),
  ('ORD-DT2-BI', 'GLU-RAC', 'Rapport albumine/créatinine', 'Tous les 6 mois'),
  ('ORD-DT2-BI', 'EAU-K', 'Kaliémie', 'À J15 après l''introduction de l''IEC, puis tous les 6 mois'),
  ('ORD-DT2-SU', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois'),
  ('ORD-DT2-SU', 'GLU-CREAT', 'Créatininémie et DFG', '2 fois par an'),
  ('ORD-DT2-INS', 'GLU-GAJ', 'Glycémie à jeun (capillaire)', 'Quotidienne pendant la titration'),
  ('ORD-DT2-INS', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois'),
  ('ORD-DT2-INS', 'EAU-K', 'Kaliémie', 'En cas de déséquilibre aigu'),
  ('ORD-DT1', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois'),
  ('ORD-DT1', 'GLU-BHB', 'Bêta-hydroxybutyrate', 'Si glycémie > 2,50 g/L ou en cas de maladie intercurrente'),
  ('ORD-DT1', 'THY-TSH', 'TSH', '1 fois par an (dépistage de la thyroïdite auto-immune associée)'),
  ('ORD-DT1', 'GLU-RAC', 'Rapport albumine/créatinine', '1 fois par an à partir de 5 ans d''évolution'),
  ('ORD-ACIDOCETOSE', 'EAU-K', 'Kaliémie', 'Toutes les 2 à 4 heures'),
  ('ORD-ACIDOCETOSE', 'GLU-BHB', 'Bêta-hydroxybutyrate', 'Toutes les 2 à 4 heures jusqu''à résolution'),
  ('ORD-ACIDOCETOSE', 'EAU-HCO3', 'Bicarbonates et gaz du sang', 'Toutes les 4 heures'),
  ('ORD-ACIDOCETOSE', 'GLU-CREAT', 'Créatininémie', 'À l''admission puis quotidiennement'),
  ('ORD-DG', 'GLU-GAJ', 'Glycémie à jeun (capillaire)', 'Quotidienne'),
  ('ORD-DG', 'GLU-HBA1C', 'HbA1c', '1 fois par trimestre (interprétation prudente)'),
  ('ORD-DG', 'GLU-HGPO', 'HGPO 75 g', 'À 6 à 12 semaines du post-partum, pour reclasser le diabète'),
  ('ORD-NEPHRO-DIAB', 'GLU-RAC', 'Rapport albumine/créatinine', 'Tous les 3 à 6 mois'),
  ('ORD-NEPHRO-DIAB', 'GLU-DFG', 'DFG estimé', 'Tous les 3 à 6 mois'),
  ('ORD-NEPHRO-DIAB', 'EAU-K', 'Kaliémie', 'À J15 après chaque augmentation de dose, puis tous les 6 mois'),
  ('ORD-NEPHRO-DIAB', 'EAU-NA', 'Ionogramme sanguin', 'Tous les 6 mois'),
  ('ORD-DYSLIP-2', 'LIP-LDL', 'Bilan lipidique complet', '8 à 12 semaines après l''initiation ou une modification, puis 1 fois par an'),
  ('ORD-DYSLIP-2', 'MET-ALAT', 'Transaminases', 'Avant traitement puis à 3 mois'),
  ('ORD-DYSLIP-2', 'MET-CK', 'Créatine kinase', 'Uniquement en cas de myalgies'),
  ('ORD-DYSLIP-1', 'LIP-LDL', 'Bilan lipidique complet', 'À 3 mois puis annuellement'),
  ('ORD-DYSLIP-1', 'MET-ALAT', 'Transaminases', 'Avant traitement puis à 3 mois'),
  ('ORD-HYPERTG', 'LIP-TG', 'Triglycérides', 'À 6 à 8 semaines puis tous les 3 à 6 mois'),
  ('ORD-HYPERTG', 'GLU-HBA1C', 'HbA1c', 'Tous les 3 mois (un diabète déséquilibré entretient l''hypertriglycéridémie)'),
  ('ORD-HYPERTG', 'MET-CK', 'Créatine kinase', 'Si association à une statine et myalgies'),
  ('ORD-HYPERTG', 'GLU-CREAT', 'Créatininémie', 'Avant traitement puis tous les 6 mois'),
  ('ORD-OSTEO', 'PCA-25OHD', '25-OH vitamine D', 'À 3 mois puis 1 fois par an'),
  ('ORD-OSTEO', 'PCA-CAT', 'Calcium total', 'Avant traitement puis annuellement'),
  ('ORD-OSTEO', 'GLU-CREAT', 'Créatininémie et DFG', 'Avant traitement (contre-indication si DFG < 35)'),
  ('ORD-OSTEO', 'PCA-DMO', 'Densitométrie osseuse (DXA)', 'À 2 ans'),
  ('ORD-CARENCE-D', 'PCA-25OHD', '25-OH vitamine D', '3 mois après la fin de la phase de charge'),
  ('ORD-CARENCE-D', 'PCA-CAT', 'Calcium total', 'En cas de dose de charge élevée ou de pathologie granulomateuse'),
  ('ORD-HYPOPARA', 'PCA-CAT', 'Calcium total', 'Toutes les 1 à 2 semaines en phase de titration, puis tous les 3 à 6 mois'),
  ('ORD-HYPOPARA', 'PCA-CAU', 'Calciurie des 24 h', 'Tous les 6 à 12 mois'),
  ('ORD-HYPOPARA', 'PCA-PHOS', 'Phosphorémie', 'Tous les 3 à 6 mois'),
  ('ORD-HYPOPARA', 'GLU-CREAT', 'Créatininémie', 'Tous les 6 à 12 mois'),
  ('ORD-ADDISON', 'EAU-NA', 'Ionogramme sanguin (natrémie)', 'À 1 mois puis tous les 6 à 12 mois'),
  ('ORD-ADDISON', 'EAU-K', 'Kaliémie', 'Tous les 6 à 12 mois'),
  ('ORD-ADDISON', 'SUR-RENA', 'Rénine active', 'Ajustement de la fludrocortisone, 1 fois par an'),
  ('ORD-ADDISON', null, 'Poids et pression artérielle couché/debout', 'À chaque consultation'),
  ('ORD-CRISE-SURR', 'EAU-NA', 'Ionogramme sanguin', 'À l''admission puis toutes les 6 à 12 h'),
  ('ORD-CRISE-SURR', 'GLU-GAJ', 'Glycémie capillaire', 'Horaire à la phase initiale'),
  ('ORD-CRISE-SURR', 'SUR-CORT8', 'Cortisol et ACTH', 'Un prélèvement avant traitement si et seulement si cela ne retarde pas l''injection'),
  ('ORD-HAP', 'EAU-K', 'Kaliémie', 'À J7 et J15, puis tous les 3 à 6 mois'),
  ('ORD-HAP', 'GLU-CREAT', 'Créatininémie', 'À J15 puis tous les 6 mois'),
  ('ORD-HAP', 'SUR-RENA', 'Rénine active', 'Une rénine qui se dénormalise témoigne d''un blocage suffisant'),
  ('ORD-HAP', null, 'Pression artérielle', 'Automesure hebdomadaire'),
  ('ORD-PRLOME', 'GON-PRL', 'Prolactine', 'À 1 mois, 3 mois, puis tous les 6 mois'),
  ('ORD-PRLOME', 'GON-MACROPRL', 'Macroprolactine', 'Une fois, avant l''initiation, si le tableau est asymptomatique'),
  ('ORD-PRLOME', 'THY-TSH', 'TSH', 'Une fois, au bilan initial (l''hypothyroïdie élève la prolactine)'),
  ('ORD-PRLOME', null, 'IRM hypophysaire', 'À 12 mois, puis selon l''évolution'),
  ('ORD-SOPK-CYCLE', 'GON-TESTO', 'Testostérone totale', 'Au bilan initial puis à 6 mois'),
  ('ORD-SOPK-CYCLE', 'SUR-17OHP', '17-OH-progestérone', 'Une fois, à 8 h, au bilan initial'),
  ('ORD-SOPK-CYCLE', 'GON-PRL', 'Prolactine', 'Une fois, au bilan initial'),
  ('ORD-SOPK-CYCLE', 'GLU-HGPO', 'HGPO 75 g', 'Au bilan initial puis tous les 1 à 3 ans'),
  ('ORD-SOPK-CYCLE', 'LIP-LDL', 'Bilan lipidique', 'Au bilan initial puis tous les 1 à 2 ans'),
  ('ORD-SOPK-GROSS', 'GON-PROG', 'Progestérone', 'À J21-J23 de chaque cycle traité (confirmation de l''ovulation)'),
  ('ORD-SOPK-GROSS', 'THY-TSH', 'TSH', 'Avant l''induction ; cible inférieure à 2,5 mUI/L'),
  ('ORD-SOPK-GROSS', 'GON-PRL', 'Prolactine', 'Avant l''induction'),
  ('ORD-SOPK-GROSS', 'GON-AMH', 'AMH', 'Bilan de réserve ovarienne'),
  ('ORD-HYPOGONAD', 'GON-TESTO', 'Testostérone totale', 'Avant la 4e injection, puis tous les 6 à 12 mois'),
  ('ORD-HYPOGONAD', null, 'Hématocrite et hémogramme', 'À 3, 6 et 12 mois, puis annuellement — arrêt si hématocrite > 54 %'),
  ('ORD-HYPOGONAD', null, 'PSA et toucher rectal', 'Avant traitement puis annuellement après 40 ans'),
  ('ORD-HYPOGONAD', 'LIP-LDL', 'Bilan lipidique', 'Annuel'),
  ('ORD-DIC', 'EAU-NA', 'Natrémie', 'À J3-J7 après l''initiation, à chaque changement de dose, puis tous les 3 à 6 mois'),
  ('ORD-DIC', 'EAU-OSMP', 'Osmolalité plasmatique', 'Lors des ajustements'),
  ('ORD-DIC', 'EAU-OSMU', 'Osmolalité urinaire', 'Lors des ajustements'),
  ('ORD-DIC', null, 'Diurèse des 24 h et poids', 'Carnet quotidien pendant la titration'),
  ('ORD-GOUTTE', 'MET-URIC', 'Acide urique', 'Tous les mois en phase de titration, puis tous les 6 mois'),
  ('ORD-GOUTTE', 'GLU-CREAT', 'Créatininémie et DFG', 'Avant traitement puis tous les 6 mois'),
  ('ORD-GOUTTE', null, 'NFS', 'Avant traitement'),
  ('ORD-OBESITE', 'CLI-IMC', 'IMC et tour de taille', 'À chaque consultation'),
  ('ORD-OBESITE', 'GLU-HGPO', 'HGPO 75 g ou HbA1c', 'Au bilan initial puis annuellement'),
  ('ORD-OBESITE', 'LIP-LDL', 'Bilan lipidique', 'Au bilan initial puis annuellement'),
  ('ORD-OBESITE', 'THY-TSH', 'TSH', 'Une fois, au bilan initial'),
  ('ORD-OBESITE', 'MET-ALAT', 'Transaminases', 'Au bilan initial (dépistage de la stéatose métabolique)'),
  ('ORD-CARENCE-B12', 'MET-B12', 'Vitamine B12', 'À 3 mois puis annuellement'),
  ('ORD-CARENCE-B12', null, 'NFS', 'À 3 mois'),
  ('ORD-CARENCE-B12', 'MET-B9', 'Folates sériques', 'Au bilan initial');

-- ---------------------------------------------------------------------
--  RACCORDEMENT AUX BILANS EXISTANTS
--  Les examens des bilans reprennent l'unité du référentiel quand leur
--  libellé correspond. L'unité conventionnelle est privilégiée : c'est
--  celle que rendent les laboratoires de Libreville.
-- ---------------------------------------------------------------------
alter table bilan_examens    add column if not exists ref_code text;
alter table examens_demandes add column if not exists ref_code text;

create or replace function _normaliser(t text) returns text
language sql immutable as $$
  select regexp_replace(
           lower(translate(coalesce(t, ''),
             'àâäéèêëîïôöûüùçÀÂÄÉÈÊËÎÏÔÖÛÜÙÇ',
             'aaaeeeeiioouuucAAAEEEEIIOOUUUC')),
           '[^a-z0-9]+', '', 'g');
$$;

-- Correspondances exactes après normalisation
update bilan_examens b
   set ref_code = r.code
  from examens_ref r
 where b.ref_code is null
   and _normaliser(b.libelle) = _normaliser(r.libelle);

-- Correspondances nommées différemment d'un document à l'autre
do $$
declare m record;
begin
  for m in select * from (values
    ('TSH','THY-TSH'), ('TSH ultrasensible','THY-TSH'), ('TSH + FT4','THY-TSH'),
    ('FT4','THY-T4L'), ('FT3','THY-T3L'),
    ('Glycémie à jeun','GLU-GAJ'), ('Glycémie post-prandiale','GLU-GPP'),
    ('HbA1c','GLU-HBA1C'),
    ('Rapport albumine/créatinine urinaire','GLU-RAC'),
    ('Cholestérol total','LIP-CT'), ('HDL cholestérol','LIP-HDL'),
    ('LDL cholestérol','LIP-LDL'), ('Triglycérides','LIP-TG'),
    ('Calcémie','PCA-CAT'), ('Calcium ionisé','PCA-CAI')
  ) as t(libelle, code)
  loop
    update bilan_examens
       set ref_code = m.code
     where libelle = m.libelle
       and ref_code is null
       and exists (select 1 from examens_ref where code = m.code);
  end loop;
end $$;

-- L'unité suit le référentiel : conventionnelle d'abord, SI à défaut
update bilan_examens b
   set unite = coalesce(nullif(r.unite_conv, '-'), r.unite_si)
  from examens_ref r
 where b.ref_code = r.code;

-- Les examens du référentiel rejoignent l'autocomplétion
insert into suggestions (domaine, valeur, code, frequence)
select 'examen', libelle, code, 0 from examens_ref
on conflict (domaine, valeur) do nothing;

insert into suggestions (domaine, valeur, code, frequence)
select 'medicament', dci, code, 0 from medicaments_ref
on conflict (domaine, valeur) do nothing;

grant all on all tables in schema public to anon, authenticated, service_role;
alter table examens_ref            disable row level security;
alter table medicaments_ref        disable row level security;
alter table ordonnances_types      disable row level security;
alter table ordonnance_type_lignes disable row level security;
alter table ordonnance_type_suivi  disable row level security;

-- ---------------------------------------------------------------------
--  Vérification
-- ---------------------------------------------------------------------
select (select count(*) from examens_ref)                        as examens_ref,
       (select count(*) from medicaments_ref)                    as medicaments,
       (select count(*) from ordonnances_types)                  as ordonnances_types,
       (select count(*) from ordonnance_type_lignes)             as lignes,
       (select count(*) from ordonnance_type_suivi)              as suivi,
       (select count(*) from bilan_examens where ref_code is not null) as bilans_raccordes,
       (select count(*) from bilan_examens)                      as bilans_total;

-- ---------------------------------------------------------------------
--  ORGANISMES SIMPLIFIÉS
--  Seuls CNAMGS, « Aucune » et une saisie libre sont employés.
--  Le champ convention n'est plus utilisé.
-- ---------------------------------------------------------------------
update patients set organisme_assurance = 'Aucune'
 where organisme_assurance in ('Aucun', 'aucun', 'AUCUN');

update patients set fonds_cnamgs = null
 where organisme_assurance is distinct from 'CNAMGS';

comment on column patients.convention is
  'Déprécié — le champ convention a été retiré de l''application.';
