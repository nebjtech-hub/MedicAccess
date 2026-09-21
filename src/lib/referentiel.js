import { supabase } from './supabase'

/**
 * Référentiels fournis par le médecin : 186 examens avec leurs unités et
 * valeurs de référence, 62 médicaments, 29 ordonnances types.
 *
 * Chargés une fois puis gardés en mémoire : ce sont des données stables,
 * inutile d'y revenir à chaque consultation.
 */

let examens = null
let medicaments = null
let ordonnances = null

const sansAccents = (s = '') =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

/* ------------------------------------------------------------- examens */

export async function chargerExamensRef() {
  if (examens) return examens
  const { data } = await supabase
    .from('examens_ref')
    .select('*')
    .order('categorie')
    .order('libelle')
  examens = data ?? []
  return examens
}

/** Retrouve un examen du référentiel par son code, sinon par son libellé. */
export function trouverExamen(liste, { code, libelle }) {
  if (!liste?.length) return null
  if (code) {
    const parCode = liste.find((e) => e.code === code)
    if (parCode) return parCode
  }
  if (!libelle) return null
  const n = sansAccents(libelle)
  return liste.find((e) => sansAccents(e.libelle) === n) ?? null
}

/** Un examen dont le résultat s'écrit en toutes lettres. */
export const estQualitatif = (ref) => ref?.type_resultat === 'qualitatif'

/** Unité à proposer : la conventionnelle d'abord, celle des laboratoires d'ici. */
export const uniteProposee = (ref) =>
  !ref ? '' : ref.unite_conv && ref.unite_conv !== '-' ? ref.unite_conv : ref.unite_si ?? ''

/**
 * Situe un résultat par rapport aux bornes du référentiel.
 *
 * Les bornes sont en unité SI ; si le résultat est saisi en unité
 * conventionnelle, il est converti par le facteur du référentiel. Quand
 * l'unité saisie ne correspond à aucune des deux, aucune évaluation n'est
 * rendue — mieux vaut ne rien dire que situer une valeur à tort.
 */
export function situerResultat(valeurBrute, uniteSaisie, ref) {
  if (!ref || estQualitatif(ref)) return null
  if (ref.borne_inf === null || ref.borne_sup === null) return null
  const m = String(valeurBrute ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const v = parseFloat(m[0])

  const u = (uniteSaisie ?? '').trim()
  let siValeur = null
  if (!u || u === ref.unite_si) siValeur = v
  else if (u === ref.unite_conv && ref.facteur) siValeur = v * Number(ref.facteur)
  else return null

  const inf = Number(ref.borne_inf)
  const sup = Number(ref.borne_sup)
  if (siValeur < inf) return { statut: 'bas', libelle: 'bas', reference: ref.reference }
  if (siValeur > sup) return { statut: 'eleve', libelle: 'élevé', reference: ref.reference }
  return { statut: 'normal', libelle: 'dans les normes', reference: ref.reference }
}

/* --------------------------------------------------------- médicaments */

export async function chargerMedicamentsRef() {
  if (medicaments) return medicaments
  const { data } = await supabase.from('medicaments_ref').select('*').order('dci')
  medicaments = data ?? []
  return medicaments
}

/** Le premier mot saisi suffit à retrouver la DCI : « metfor » → Metformine. */
export function trouverMedicament(liste, saisie) {
  if (!liste?.length || !saisie?.trim()) return null
  const n = sansAccents(saisie)
  return (
    liste.find((m) => sansAccents(m.dci) === n) ??
    liste.find((m) => n.startsWith(sansAccents(m.dci))) ??
    liste.find((m) => sansAccents(m.dci).startsWith(n) && n.length >= 4) ??
    null
  )
}

/* ---------------------------------------------------- ordonnances types */

export async function chargerOrdonnancesTypes() {
  if (ordonnances) return ordonnances
  const { data } = await supabase
    .from('ordonnances_types')
    .select('*, lignes:ordonnance_type_lignes(*), suivi:ordonnance_type_suivi(*)')
    .order('nom')
  ordonnances = (data ?? []).map((o) => ({
    ...o,
    lignes: [...(o.lignes ?? [])].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
  }))
  return ordonnances
}