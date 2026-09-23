/**
 * Calculs dérivés des résultats d'examens et des constantes.
 *
 * Même principe que l'IMC : dès que les valeurs nécessaires sont saisies,
 * le résultat apparaît sans que le médecin ait à le demander.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Toutes les formules ci-dessous sont des formules publiées et     │
 * │ d'usage courant, mais elles n'ont PAS été validées par le        │
 * │ médecin. Les unités attendues sont celles du laboratoire         │
 * │ partenaire : mmol/L pour le glucose, les lipides, le calcium et  │
 * │ l'urée, µmol/L pour la créatinine et l'acide urique, g/L pour    │
 * │ l'albumine. Chaque résultat est affiché avec                     │
 * │ la mention de sa formule pour qu'il soit vérifiable, et reste    │
 * │ indicatif : c'est le médecin qui l'accepte ou l'écarte.          │
 * └──────────────────────────────────────────────────────────────────┘
 */

/** Première valeur numérique d'un texte saisi librement (« 1,24 g/L » → 1.24). */
export const nombre = (v) => {
  if (v === null || v === undefined) return null
  const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

const arrondi = (n, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null)

/**
 * Chaque calcul déclare ce dont il a besoin. `sources` liste les libellés
 * d'examens ou de constantes ; `calcul` reçoit les valeurs numériques.
 */
export const CALCULS = [
  {
    code: 'dfg',
    nom: 'Débit de filtration glomérulaire estimé',
    abrege: 'DFG',
    unite: 'mL/min/1,73 m²',
    examens: ['DFG estimé', 'Débit de filtration glomérulaire estimé (DFG)'],
    formule: 'CKD-EPI 2021, sans coefficient ethnique',
    sources: ['Créatinine'],
    unites: { 'Créatinine': 'µmol/L' },
    besoinPatient: ['age', 'sexe'],
    calcul: ({ Créatinine }, patient) => {
      // Le laboratoire rend en µmol/L ; la formule attend des mg/dL
      const scr = Créatinine / 88.4
      const age = patient?.age
      const sexe = patient?.sexe
      if (!scr || !age || !sexe) return null
      const femme = sexe === 'Féminin'
      const k = femme ? 0.7 : 0.9
      const a = femme ? -0.241 : -0.302
      const v =
        142 *
        Math.pow(Math.min(scr / k, 1), a) *
        Math.pow(Math.max(scr / k, 1), -1.2) *
        Math.pow(0.9938, age) *
        (femme ? 1.012 : 1)
      return arrondi(v, 0)
    },
    interpretation: (v) => {
      if (v >= 90) return 'Fonction rénale normale ou élevée'
      if (v >= 60) return 'Diminution légère'
      if (v >= 45) return 'Diminution légère à modérée'
      if (v >= 30) return 'Diminution modérée à sévère'
      if (v >= 15) return 'Diminution sévère'
      return 'Insuffisance rénale terminale'
    },
  },
  {
    code: 'ldl_calcule',
    nom: 'LDL cholestérol calculé',
    abrege: 'LDL calculé',
    unite: 'mmol/L',
    examens: ['LDL cholestérol', 'LDL-cholestérol'],
    formule: 'Friedewald : CT − HDL − TG/2,2 (en mmol/L)',
    sources: ['Cholestérol total', 'HDL cholestérol', 'Triglycérides'],
    unites: { 'Cholestérol total': 'mmol/L', 'HDL cholestérol': 'mmol/L', Triglycérides: 'mmol/L' },
    calcul: ({ 'Cholestérol total': ct, 'HDL cholestérol': hdl, Triglycérides: tg }) => {
      if (!ct || !hdl || tg === null) return null
      if (tg >= 4.5) return null // formule invalide au-delà de 4,5 mmol/L
      return arrondi(ct - hdl - tg / 2.2)
    },
    avertissement: (v, vals) =>
      vals.Triglycérides >= 4.5
        ? 'Triglycérides ≥ 4,5 mmol/L : la formule de Friedewald ne s’applique pas, dosage direct nécessaire'
        : null,
  },
  {
    code: 'non_hdl',
    nom: 'Cholestérol non-HDL',
    abrege: 'Non-HDL',
    unite: 'mmol/L',
    examens: ['Cholestérol non-HDL', 'Non-HDL-cholestérol'],
    formule: 'CT − HDL',
    sources: ['Cholestérol total', 'HDL cholestérol'],
    unites: { 'Cholestérol total': 'mmol/L', 'HDL cholestérol': 'mmol/L' },
    calcul: ({ 'Cholestérol total': ct, 'HDL cholestérol': hdl }) =>
      ct && hdl ? arrondi(ct - hdl) : null,
  },
  {
    code: 'ratio_ct_hdl',
    nom: 'Rapport cholestérol total / HDL',
    abrege: 'CT/HDL',
    unite: '',
    formule: 'Cholestérol total ÷ HDL',
    examens: ['Rapport cholestérol total / HDL'],
    sources: ['Cholestérol total', 'HDL cholestérol'],
    unites: { 'Cholestérol total': 'mmol/L', 'HDL cholestérol': 'mmol/L' },
    calcul: ({ 'Cholestérol total': ct, 'HDL cholestérol': hdl }) =>
      ct && hdl ? arrondi(ct / hdl, 1) : null,
  },
  {
    code: 'calcium_corrige',
    nom: 'Calcémie corrigée par l’albuminémie',
    abrege: 'Ca corrigé',
    unite: 'mmol/L',
    examens: ['Calcémie corrigée', 'Calcémie corrigée sur l’albumine'],
    formule: 'Ca + 0,02 × (40 − albuminémie en g/L)',
    sources: ['Calcémie', 'Albuminémie'],
    unites: { Calcémie: 'mmol/L', Albuminémie: 'g/L' },
    calcul: ({ Calcémie: ca, Albuminémie: alb }) =>
      ca && alb ? arrondi(ca + 0.02 * (40 - alb), 2) : null,
  },
  {
    code: 'rapport_aldo_renine',
    nom: 'Rapport aldostérone / rénine',
    abrege: 'ARR',
    unite: '',
    examens: ['Rapport aldostérone / rénine'],
    formule: 'Aldostérone ÷ rénine, les deux en pg/mL',
    sources: ['Aldostérone plasmatique', 'Rénine'],
    calcul: ({ 'Aldostérone plasmatique': aldo, Rénine: renine }) =>
      aldo && renine ? arrondi(aldo / renine, 1) : null,
  },
  {
    code: 'rapport_taille_hanche',
    nom: 'Rapport tour de taille / tour de hanche',
    abrege: 'RTH',
    unite: '',
    formule: 'Tour de taille ÷ tour de hanche',
    sources: ['Tour de taille', 'Tour de hanche'],
    calcul: ({ 'Tour de taille': t, 'Tour de hanche': h }) => (t && h ? arrondi(t / h) : null),
  },
  {
    code: 'rapport_taille_stature',
    nom: 'Rapport tour de taille / taille',
    abrege: 'RTT',
    unite: '',
    formule: 'Tour de taille ÷ taille, les deux en cm',
    sources: ['Tour de taille', 'Taille'],
    calcul: ({ 'Tour de taille': t, Taille: s }) => (t && s ? arrondi(t / s) : null),
  },
]

/**
 * Exécute tous les calculs possibles.
 * @param {Object} valeurs  libellé → valeur brute (résultat d'examen ou constante)
 * @param {Object} patient  { age, sexe }
 * @returns {Array} calculs aboutis, dans l'ordre de déclaration
 */
export function calculerTout(valeurs = {}, patient = {}, unites = {}) {
  const num = {}
  Object.entries(valeurs).forEach(([k, v]) => {
    const n = nombre(v)
    if (n !== null) num[k] = n
  })

  const resultats = []
  CALCULS.forEach((c) => {
    const disponibles = c.sources.filter((s) => num[s] !== undefined)
    if (disponibles.length < c.sources.length) return

    // Une unité saisie différente de celle attendue rendrait le résultat
    // faux d'un facteur dix ou mille : on préfère ne pas calculer.
    const conflit = Object.entries(c.unites ?? {}).find(([src, attendue]) => {
      const u = (unites[src] ?? '').trim()
      return u && u !== attendue
    })
    if (conflit) {
      resultats.push({
        code: c.code, nom: c.nom, abrege: c.abrege, valeur: null, unite: c.unite,
        formule: c.formule, interpretation: null,
        avertissement: `Calcul non effectué : ${conflit[0]} attendu en ${conflit[1]}, saisi en ${unites[conflit[0]]}`,
      })
      return
    }

    let valeur = null
    try {
      valeur = c.calcul(num, patient)
    } catch {
      valeur = null
    }
    const avertissement = c.avertissement ? c.avertissement(valeur, num) : null
    if (valeur === null && !avertissement) return

    resultats.push({
      code: c.code,
      nom: c.nom,
      abrege: c.abrege,
      valeur,
      unite: c.unite,
      formule: c.formule,
      avertissement,
      interpretation: valeur !== null && c.interpretation ? c.interpretation(valeur) : null,
    })
  })
  return resultats
}

/**
 * Calcul capable de remplir une ligne d'examen donnée.
 * Sert à ne pas demander à la main ce que l'application sait déduire.
 */
export function calculPourExamen(libelle) {
  if (!libelle) return null
  const n = libelle.trim().toLowerCase()
  return CALCULS.find((c) => (c.examens ?? []).some((e) => e.toLowerCase() === n)) ?? null
}

/** Ce qui manque pour qu'un calcul aboutisse — sert à guider la saisie. */
export function calculsIncomplets(valeurs = {}, patient = {}) {
  const num = {}
  Object.entries(valeurs).forEach(([k, v]) => {
    const n = nombre(v)
    if (n !== null) num[k] = n
  })

  return CALCULS.map((c) => {
    const manquants = c.sources.filter((s) => num[s] === undefined)
    if (!manquants.length || manquants.length === c.sources.length) return null
    return { nom: c.nom, abrege: c.abrege, manquants }
  }).filter(Boolean)
}