import { dateFr, dateHeureFr, jourLong, age, nomComplet } from './format'

const sansAccents = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

/**
 * Catalogue des variables insérables — sert à la fois de documentation et
 * de source pour les pastilles cliquables de l'éditeur de modèles.
 */
export const CATALOGUE_VARIABLES = [
  {
    groupe: 'Patient',
    variables: [
      ['patient.nom', 'Nom'],
      ['patient.prenom', 'Prénom'],
      ['patient.nom_complet', 'Nom et prénom'],
      ['patient.code', 'N° de dossier'],
      ['patient.sexe', 'Sexe'],
      ['patient.age', 'Âge'],
      ['patient.date_naissance', 'Date de naissance'],
      ['patient.lieu_naissance', 'Lieu de naissance'],
      ['patient.profession', 'Profession'],
      ['patient.telephone', 'Téléphone'],
      ['patient.adresse', 'Adresse'],
      ['patient.ville', 'Ville'],
      ['patient.groupe_sanguin', 'Groupe sanguin'],
      ['patient.allergies', 'Allergies'],
    ],
  },
  {
    groupe: 'Assurance',
    variables: [
      ['patient.organisme', "Organisme d'assurance"],
      ['patient.numero_secu', 'N° de sécurité sociale'],
      ['patient.regime', "Régime d'assurance"],
      ['patient.taux', 'Taux de couverture'],
      ['patient.convention', 'Convention'],
    ],
  },
  {
    groupe: 'Consultation',
    variables: [
      ['consultation.numero', 'N° de consultation'],
      ['consultation.date', 'Date de la consultation'],
      ['consultation.type', 'Type de consultation'],
      ['consultation.motif', 'Motif'],
      ['consultation.histoire_maladie', 'Histoire de la maladie'],
      ['consultation.examen_clinique', 'Examen clinique'],
      ['consultation.examen_paraclinique', 'Examen paraclinique'],
      ['consultation.diagnostic', 'Diagnostic'],
      ['consultation.conduite_a_tenir', 'Conduite à tenir'],
      ['consultation.examens_demandes', 'Examens demandés'],
      ['consultation.note', 'Note'],
      ['consultation.antecedents', 'Antécédents'],
      ['consultation.motifs', 'Motifs retenus'],
    ],
  },
  {
    groupe: 'Interrogatoire',
    variables: [
      ['interrogatoire.antecedents', 'Antécédents et mode de vie recueillis'],
      ['interrogatoire.histoire', 'Signes et symptômes recueillis'],
      ['interrogatoire.complet', "Intégralité de l'interrogatoire"],
    ],
  },
  {
    groupe: 'Prescriptions',
    variables: [
      ['examens.demandes', 'Examens prescrits ce jour'],
      ['examens.resultats', 'Résultats des examens reçus'],
      ['ordonnance.lignes', 'Traitement prescrit ce jour'],
    ],
  },
  {
    groupe: 'Constantes',
    variables: [
      ['parametres.tous', 'Toutes les constantes saisies'],
      ['parametres.poids', 'Poids'],
      ['parametres.taille', 'Taille'],
      ['parametres.temperature', 'Température'],
      ['parametres.pa', 'Pression artérielle (Syst/Diast)'],
      ['parametres.oxymetrie', 'Oxymétrie'],
      ['parametres.dextro', 'DEXTRO'],
      ['parametres.frequence_cardiaque', 'Fréquence cardiaque'],
      ['parametres.imc', 'Indice de masse corporelle'],
    ],
  },
  {
    groupe: 'Médecin & document',
    variables: [
      ['medecin.civilite', 'Civilité'],
      ['medecin.nom', 'Nom du médecin'],
      ['medecin.prenom', 'Prénom du médecin'],
      ['medecin.specialite', 'Spécialité'],
      ['medecin.numero_ordre', "N° à l'Ordre"],
      ['medecin.service', 'Service'],
      ['etablissement', 'Établissement'],
      ['cr.numero', 'N° du compte rendu'],
      ['date.jour', "Date du jour (en lettres)"],
      ['date.court', 'Date du jour (jj/mm/aaaa)'],
      ['date.heure', 'Date et heure'],
    ],
  },
]

/**
 * Construit le dictionnaire de remplacement.
 */
export function construireContexte({
  patient, consultation, parametres = [], medecin, compteRendu,
  motifs = [], interrogatoire = {}, examens = [], ordonnance = [], resultats = [],
}) {
  const p = patient ?? {}
  const c = consultation ?? {}
  const m = medecin ?? {}

  const parLibelle = {}
  parametres.forEach((x) => {
    if (x?.libelle) parLibelle[sansAccents(x.libelle)] = x
  })
  const val = (cle) => {
    const x = parLibelle[cle]
    if (!x?.valeur) return ''
    return `${x.valeur}${x.unite ? ' ' + x.unite : ''}`
  }

  const constantesRenseignees = parametres
    .filter((x) => String(x.valeur ?? '').trim() !== '')
    .map((x) => `${x.libelle} : ${x.valeur}${x.unite ? ' ' + x.unite : ''}`)
    .join(' — ')

  const pa = [val('pa_systolique'), val('pa_diastolique')].filter(Boolean)

  return {
    'patient.nom': (p.nom ?? '').toUpperCase(),
    'patient.prenom': p.prenom ?? '',
    'patient.nom_complet': nomComplet(p),
    'patient.code': p.code ?? '',
    'patient.sexe': p.sexe ?? '',
    'patient.age': p.date_naissance ? String(age(p.date_naissance)) : '',
    'patient.date_naissance': dateFr(p.date_naissance),
    'patient.lieu_naissance': p.lieu_naissance ?? '',
    'patient.profession': p.profession ?? '',
    'patient.telephone': p.telephone || p.mobile || '',
    'patient.adresse': [p.adresse, p.quartier].filter(Boolean).join(', '),
    'patient.ville': p.ville ?? '',
    'patient.groupe_sanguin': p.groupe_sanguin ?? '',
    'patient.allergies': p.allergies || 'Aucune allergie connue',
    'patient.organisme': p.organisme_assurance || 'Aucun',
    'patient.numero_secu': p.numero_secu ?? '',
    'patient.regime': p.regime_assurance ?? '',
    'patient.taux': p.taux_couverture ? `${p.taux_couverture} %` : '',
    'patient.convention': p.convention ?? '',

    'consultation.numero': c.numero ?? '',
    'consultation.date': dateFr(c.date_consultation),
    'consultation.type': c.type_consultation ?? '',
    'consultation.motif': c.motif ?? '',
    'consultation.histoire_maladie': c.histoire_maladie ?? '',
    'consultation.examen_clinique': c.examen_clinique ?? '',
    'consultation.examen_paraclinique': c.examen_paraclinique ?? '',
    'consultation.diagnostic': c.diagnostic ?? '',
    'consultation.conduite_a_tenir': c.conduite_a_tenir ?? '',
    'consultation.examens_demandes': c.examens_demandes ?? '',
    'consultation.note': c.note ?? '',
    'consultation.antecedents': c.antecedents ?? '',

    'parametres.tous': constantesRenseignees,
    'parametres.poids': val('poids'),
    'parametres.taille': val('taille'),
    'parametres.temperature': val('temperature'),
    'parametres.pa': pa.length ? pa.join(' / ') : '',
    'parametres.oxymetrie': val('oxymetrie'),
    'parametres.dextro': val('dextro'),
    'parametres.frequence_cardiaque': val('frequence_cardiaque'),
    'parametres.imc': val('indice_de_masse_corporelle'),

    'medecin.civilite': m.civilite || 'Dr',
    'medecin.nom': (m.nom ?? '').toUpperCase(),
    'medecin.prenom': m.prenom ?? '',
    'medecin.specialite': m.specialite ?? '',
    'medecin.numero_ordre': m.numero_ordre ?? '',
    'medecin.service': m.service ?? '',
    etablissement: m.etablissement || 'Centre Diagnostic — Libreville',

    'consultation.motifs': motifs.join(', '),

    'interrogatoire.antecedents': interrogatoire.antecedents ?? '',
    'interrogatoire.histoire': interrogatoire.histoire_maladie ?? '',
    'interrogatoire.complet': interrogatoire.complet ?? '',

    'examens.demandes': examens.length
      ? examens
          .map((e) => `— ${e.libelle}${e.urgent ? ' (urgent)' : ''}`)
          .join('\n')
      : 'Aucun examen prescrit ce jour.',

    'examens.resultats': resultats.length
      ? resultats.map((r) => `— ${r.libelle} : ${r.resultat}`).join('\n')
      : '',

    'ordonnance.lignes': ordonnance.length
      ? ordonnance
          .map((l, i) =>
            `${i + 1}. ${[l.medicament, l.dosage].filter(Boolean).join(' ')}` +
            `${l.forme ? ` — ${l.forme}` : ''}` +
            `${l.posologie ? `\n   ${l.posologie}` : ''}` +
            `${l.duree ? ` pendant ${l.duree}` : ''}` +
            `${l.instructions ? ` — ${l.instructions}` : ''}`
          )
          .join('\n')
      : 'Aucun traitement prescrit ce jour.',

    'cr.numero': compteRendu?.numero ?? '',
    'date.jour': jourLong(),
    'date.court': dateFr(new Date()),
    'date.heure': dateHeureFr(new Date()),
  }
}

/**
 * Remplace les {{variables}} d'un gabarit. Les variables inconnues sont
 * laissées visibles pour que le médecin repère tout de suite la faute de
 * frappe plutôt que de découvrir un trou dans le document imprimé.
 */
export function fusionner(gabarit = '', contexte = {}) {
  return String(gabarit).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (brut, cle) => {
    if (Object.prototype.hasOwnProperty.call(contexte, cle)) return contexte[cle] ?? ''
    return brut
  })
}

/** Assemble en-tête + corps + pied puis fusionne. */
export function composerCompteRendu(modele, contexte) {
  const bloc = [modele?.entete, modele?.corps, modele?.pied].filter(Boolean).join('\n\n———\n\n')
  return fusionner(bloc, contexte)
}
