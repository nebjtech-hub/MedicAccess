import { supabase } from './supabase'

/* =====================================================================
   Suggestions — autocomplétion alimentée par l'usage
   ===================================================================== */

const cache = new Map()

/** Valeurs d'un domaine, les plus employées en tête. */
export async function chargerSuggestions(domaine) {
  if (cache.has(domaine)) return cache.get(domaine)
  const { data } = await supabase
    .from('suggestions')
    .select('valeur, code, frequence')
    .eq('domaine', domaine)
    .order('frequence', { ascending: false })
    .order('valeur')
    .limit(400)
  const liste = data ?? []
  cache.set(domaine, liste)
  return liste
}

/**
 * Mémorise une valeur saisie et incrémente sa fréquence. C'est ce qui fait
 * qu'au bout de quelques semaines l'autocomplétion propose les habitudes
 * réelles du praticien plutôt qu'une liste générique.
 */
export async function memoriserSaisie(domaine, valeur) {
  const v = String(valeur ?? '').trim()
  if (v.length < 2) return
  const { data } = await supabase
    .from('suggestions')
    .select('id, frequence')
    .eq('domaine', domaine)
    .eq('valeur', v)
    .maybeSingle()

  if (data) {
    await supabase
      .from('suggestions')
      .update({ frequence: (data.frequence ?? 0) + 1 })
      .eq('id', data.id)
  } else {
    await supabase.from('suggestions').insert({ domaine, valeur: v, frequence: 1 })
  }
  cache.delete(domaine)
}

/* =====================================================================
   Abréviations — dépliage à la frappe
   ===================================================================== */

let abreviations = null

export async function chargerAbreviations() {
  if (abreviations) return abreviations
  const { data } = await supabase.from('abreviations').select('raccourci, texte').eq('actif', true)
  abreviations = new Map((data ?? []).map((a) => [a.raccourci.toLowerCase(), a.texte]))
  return abreviations
}

/**
 * Déplie le mot situé juste avant le curseur s'il correspond à un raccourci.
 * Renvoie null si rien ne correspond, pour laisser la frappe intacte.
 */
export function deplier(texte, position, table) {
  if (!table) return null
  const avant = texte.slice(0, position)
  const mot = avant.match(/(^|[\s\n])([a-zA-Zàâçéèêëîïôûù]{2,12})$/)
  if (!mot) return null
  const remplacement = table.get(mot[2].toLowerCase())
  if (!remplacement) return null

  const debut = position - mot[2].length
  return {
    texte: texte.slice(0, debut) + remplacement + texte.slice(position),
    position: debut + remplacement.length,
  }
}
