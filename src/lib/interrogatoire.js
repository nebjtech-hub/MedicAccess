import { supabase } from './supabase'

/**
 * Charge les grilles avec leurs sections et leurs items en une seule requête.
 * Les compteurs affichés sur les tuiles de motifs en sont déduits.
 */
export async function chargerGrilles() {
  const { data, error } = await supabase
    .from('grilles')
    .select(
      'id, code, nom, icone, ordre, defaut, ' +
        'sections:grille_sections(id, titre, sexe, ordre, a_valider, ' +
        'liens:grille_items(ordre, item:items(id, code, libelle, type, unite, options, categorie)))'
    )
    .eq('actif', true)
    .order('ordre')

  if (error) throw error

  return (data ?? []).map((g) => {
    const sections = [...(g.sections ?? [])]
      .sort((a, b) => a.ordre - b.ordre)
      .map((s) => ({
        ...s,
        items: [...(s.liens ?? [])]
          .sort((a, b) => a.ordre - b.ordre)
          .map((l) => l.item)
          .filter(Boolean),
      }))
    const distincts = new Set(sections.flatMap((s) => s.items.map((i) => i.id)))
    return { ...g, sections, nbItems: distincts.size }
  })
}

/**
 * Fusionne les grilles sélectionnées en un formulaire unique.
 *
 * Un item partagé par plusieurs motifs reste affiché dans chaque rubrique
 * prévue par le médecin, mais l'état est unique : c'est la clé de la
 * mutualisation. `mutualise` sert à l'indiquer visuellement.
 */
export function fusionner(grilles, codesRetenus, sexePatient) {
  const retenues = grilles.filter((g) => codesRetenus.includes(g.code))
  const compte = new Map()
  retenues.forEach((g) =>
    g.sections.forEach((s) =>
      s.items.forEach((i) => compte.set(i.id, (compte.get(i.id) ?? 0) + 1))
    )
  )

  const sections = []
  retenues.forEach((g) => {
    g.sections.forEach((s) => {
      // Les rubriques réservées à un sexe sont masquées pour l'autre
      if (s.sexe && sexePatient && s.sexe !== sexePatient) return
      const items = s.items.map((i) => ({ ...i, mutualise: (compte.get(i.id) ?? 0) > 1 }))
      if (items.length) sections.push({ ...s, grille: g.nom, grilleCode: g.code, items })
    })
  })

  const distincts = new Set(sections.flatMap((s) => s.items.map((i) => i.id)))
  const emplacements = sections.reduce((n, s) => n + s.items.length, 0)
  return { sections, nbDistincts: distincts.size, nbMutualises: emplacements - distincts.size }
}

/* ------------------------------------------------------------------ réponses */

export async function chargerReponses(consultationId) {
  const { data } = await supabase
    .from('consultation_reponses')
    .select('item_id, etat, valeur, remarque')
    .eq('consultation_id', consultationId)
  const m = {}
  ;(data ?? []).forEach((r) => {
    m[r.item_id] = { etat: r.etat, valeur: r.valeur ?? '', remarque: r.remarque ?? '' }
  })
  return m
}

export async function enregistrerReponses(consultationId, reponses) {
  const lignes = Object.entries(reponses)
    .filter(([, r]) => r && (r.etat !== 'non_explore' || r.valeur || r.remarque))
    .map(([item_id, r]) => ({
      consultation_id: consultationId,
      item_id,
      etat: r.etat ?? 'non_explore',
      valeur: r.valeur || null,
      remarque: r.remarque || null,
      updated_at: new Date().toISOString(),
    }))

  if (!lignes.length) return null
  const { error } = await supabase
    .from('consultation_reponses')
    .upsert(lignes, { onConflict: 'consultation_id,item_id' })
  return error
}

export async function enregistrerMotifs(consultationId, grilles, codes) {
  const ids = grilles.filter((g) => codes.includes(g.code)).map((g) => g.id)
  await supabase.from('consultation_motifs').delete().eq('consultation_id', consultationId)
  if (!ids.length) return
  await supabase
    .from('consultation_motifs')
    .insert(ids.map((grille_id) => ({ consultation_id: consultationId, grille_id })))
}

export async function chargerMotifs(consultationId) {
  const { data } = await supabase
    .from('consultation_motifs')
    .select('grille:grilles(code)')
    .eq('consultation_id', consultationId)
  return (data ?? []).map((x) => x.grille?.code).filter(Boolean)
}

/* ------------------------------------------------------- composition du texte */

const minuscule = (s = '') => s.charAt(0).toLowerCase() + s.slice(1)

/**
 * Compose le texte clinique à partir des réponses.
 * Les signes présents et les signes explicitement absents sont rapportés
 * séparément : un signe recherché et absent est une information clinique,
 * pas un blanc.
 */
export function composerTexte(sections, reponses, { inclureAbsents = true } = {}) {
  const blocs = []
  const dejaVu = new Set()

  sections.forEach((s) => {
    const presents = []
    const absents = []
    const valeurs = []

    s.items.forEach((i) => {
      const r = reponses[i.id]
      if (!r) return
      const cle = `${s.id}|${i.id}`
      if (dejaVu.has(cle)) return
      dejaVu.add(cle)

      if (i.type === 'booleen') {
        const libelle = minuscule(i.libelle) + (r.remarque ? ` (${r.remarque})` : '')
        if (r.etat === 'presente') presents.push(libelle)
        else if (r.etat === 'absente') absents.push(minuscule(i.libelle))
      } else if (String(r.valeur ?? '').trim()) {
        // Le « (préciser) » est une consigne de saisie : il n'a pas à se
        // retrouver dans le compte rendu imprimé.
        const intitule = i.categorie === 'autre' ? 'Autre' : i.libelle
        valeurs.push(`${intitule} : ${r.valeur}${i.unite ? ' ' + i.unite : ''}`)
      }
    })

    if (!presents.length && !absents.length && !valeurs.length) return

    const morceaux = []
    if (valeurs.length) morceaux.push(valeurs.join(' — '))
    if (presents.length) morceaux.push(`Présents : ${presents.join(', ')}.`)
    if (inclureAbsents && absents.length)
      morceaux.push(`Recherchés et absents : ${absents.join(', ')}.`)

    blocs.push(`${s.titre.toUpperCase()}\n${morceaux.join(' ')}`)
  })

  return blocs.join('\n\n')
}

/**
 * Répartit le texte composé selon la nature des items.
 *
 * Les grilles sont des grilles d'INTERROGATOIRE : elles alimentent
 * l'anamnèse, pas l'examen physique. Celui-ci reste à la main du médecin,
 * assisté par les constantes.
 */
export function composerParDestination(sections, reponses) {
  const estAntecedent = (i) => i.categorie === 'antecedent' || i.categorie === 'habitude'

  const anamnese = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !estAntecedent(i)) }))
    .filter((s) => s.items.length)
  const passe = sections
    .map((s) => ({ ...s, items: s.items.filter(estAntecedent) }))
    .filter((s) => s.items.length)

  return {
    histoire_maladie: composerTexte(anamnese, reponses),
    antecedents: composerTexte(passe, reponses),
    complet: composerTexte(sections, reponses),
  }
}

/** Nombre d'items renseignés / total, pour la barre de progression. */
export function progression(sections, reponses) {
  const ids = new Set(sections.flatMap((s) => s.items.map((i) => i.id)))
  let faits = 0
  ids.forEach((id) => {
    const r = reponses[id]
    if (r && (r.etat === 'presente' || r.etat === 'absente' || String(r.valeur ?? '').trim()))
      faits++
  })
  return { faits, total: ids.size }
}

/* --------------------------------------------------------------- bilans types */

/**
 * Bilans proposés pour les motifs retenus, dédoublonnés :
 * un examen commun à deux bilans n'est proposé — donc prescrit — qu'une fois.
 */
export async function chargerBilans(grilles, codesRetenus) {
  // Filtrage par identifiant : plus sûr qu'un filtre sur ressource imbriquée
  const ids = grilles.filter((g) => codesRetenus.includes(g.code)).map((g) => g.id)
  if (!ids.length) return []
  const { data } = await supabase
    .from('bilan_blocs')
    .select('id, titre, ordre, a_valider, grille:grilles(code, nom), ' +
            'examens:bilan_examens(id, libelle, code, type, conditionnel, condition, ordre)')
    .in('grille_id', ids)
    .order('ordre')

  const vus = new Map()
  return (data ?? []).map((b) => ({
    ...b,
    examens: [...(b.examens ?? [])]
      .sort((a, b2) => a.ordre - b2.ordre)
      .map((e) => {
        const cle = (e.code || e.libelle).toLowerCase()
        const doublon = vus.has(cle)
        if (!doublon) vus.set(cle, b.grille?.nom)
        return { ...e, doublon, dejaDans: doublon ? vus.get(cle) : null }
      }),
  }))
}
