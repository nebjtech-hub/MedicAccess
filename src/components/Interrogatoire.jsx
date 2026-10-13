import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, ArrowDownToLine, ArrowRight, Save, Link2, CornerDownLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  fusionner, chargerReponses, enregistrerReponses, composerTexte,
  composerParDestination, progression,
} from '../lib/interrogatoire'
import { Alerte } from './ui'

const ETATS = {
  presente: { symbole: '+', classe: 'bg-panneau-ambre text-[#8a5010] border-panneau-ambreb' },
  absente: { symbole: '−', classe: 'bg-panneau-vert text-[#2c6435] border-panneau-vertb' },
  non_explore: { symbole: '·', classe: 'bg-transparent text-encre/35 border-sarcelle-100' },
}

/**
 * Formulaire d'interrogatoire issu de la fusion des motifs retenus.
 *
 * Trois états par signe plutôt qu'une case à cocher : une case confondrait
 * « non demandé » et « absent », alors qu'un signe recherché et absent est
 * une information clinique.
 */
export default function Interrogatoire({
  consultationId, grilles, motifs, sexePatient, patientId,
  onInserer, onValider, onProgression,
}) {
  const [reponses, setReponses] = useState({})

  // Les rubriques conditionnelles apparaissent et disparaissent selon les
  // réponses : « Diabète de novo » n'ouvre pas les mêmes questions que
  // « Diabète connu ».
  const { sections } = useMemo(
    () => fusionner(grilles, motifs, sexePatient, reponses),
    [grilles, motifs, sexePatient, reponses]
  )

  const [pret, setPret] = useState(false)
  const ancres = useRef({})
  const vuesPrecedentes = useRef(null)
  const [etat, setEtat] = useState({ message: '', erreur: '' })
  const [aide, setAide] = useState(false)
  const refs = useRef({})

  useEffect(() => {
    if (!consultationId) return
    chargerReponses(consultationId).then((r) => {
      setReponses(r)
      setPret(true)
    })
  }, [consultationId])

  /* Le traitement en cours est rarement différent de la dernière
     ordonnance : on le propose plutôt que de le faire ressaisir. */
  const [traitementAnterieur, setTraitementAnterieur] = useState('')
  useEffect(() => {
    if (!patientId) return
    supabase
      .from('ordonnances')
      .select('date_ordonnance, lignes:ordonnance_lignes(medicament, dosage, posologie, ordre)')
      .eq('patient_id', patientId)
      .order('date_ordonnance', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const lignes = [...(data?.[0]?.lignes ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        if (!lignes.length) return
        setTraitementAnterieur(
          lignes
            .map((l) => [l.medicament, l.dosage, l.posologie].filter(Boolean).join(' '))
            .join(' ; ')
        )
      })
  }, [patientId])

  /* Mémoire des réponses libres.
   *
   * Deux sources, complémentaires :
   *   — ce que le médecin a déjà écrit POUR CE PATIENT, qui vient en
   *     premier parce que c'est presque toujours la bonne réponse ;
   *   — ce qu'il écrit LE PLUS SOUVENT, tous patients confondus, qui
   *     prend le relais quand le patient est nouveau.
   *
   * Objectif : qu'un champ de traitement se remplisse d'un clic plutôt
   * que d'une ligne tapée à chaque consultation.
   */
  const [memoire, setMemoire] = useState({})

  // Items à saisie libre des grilles retenues, condition ou non :
  // la liste doit rester stable quand une branche s'ouvre.
  const idsTexte = useMemo(() => {
    const ids = new Set()
    grilles
      .filter((g) => motifs.includes(g.code))
      .forEach((g) =>
        g.sections.forEach((s) =>
          s.items.forEach((i) => {
            if (i.type === 'texte' && i.categorie !== 'autre') ids.add(i.id)
          })
        )
      )
    return [...ids]
  }, [grilles, motifs])

  useEffect(() => {
    if (!idsTexte.length) return
    let vivant = true

    ;(async () => {
      // Consultations du patient, pour distinguer ses propres réponses
      let idsPatient = []
      if (patientId) {
        const { data } = await supabase
          .from('consultations')
          .select('id')
          .eq('patient_id', patientId)
          .order('date_consultation', { ascending: false })
          .limit(20)
        idsPatient = (data ?? []).map((c) => c.id).filter((x) => x !== consultationId)
      }

      const { data } = await supabase
        .from('consultation_reponses')
        .select('item_id, valeur, consultation_id, updated_at')
        .in('item_id', idsTexte)
        .not('valeur', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(3000)

      if (!vivant) return

      const parItem = {}
      const compteurs = {}

      ;(data ?? []).forEach((r) => {
        const v = String(r.valeur ?? '').trim()
        if (v.length < 2 || r.consultation_id === consultationId) return
        const cle = `${r.item_id}|${v.toLowerCase()}`
        const c = (compteurs[cle] ??= {
          item: r.item_id,
          valeur: v,
          n: 0,
          patient: false,
          vu: r.updated_at,
        })
        c.n += 1
        if (idsPatient.includes(r.consultation_id)) c.patient = true
      })

      Object.values(compteurs).forEach((c) => (parItem[c.item] ??= []).push(c))

      Object.keys(parItem).forEach((item) => {
        parItem[item] = parItem[item]
          .sort((a, b) => {
            // Ce patient d'abord, puis le plus souvent écrit, puis le plus récent
            if (a.patient !== b.patient) return a.patient ? -1 : 1
            if (b.n !== a.n) return b.n - a.n
            return new Date(b.vu) - new Date(a.vu)
          })
          .slice(0, 6)
      })

      setMemoire(parItem)
    })()

    return () => {
      vivant = false
    }
  }, [idsTexte, patientId, consultationId])

  /* Enregistrement différé : la frappe ne déclenche pas une requête par touche */
  useEffect(() => {
    if (!pret) return
    const minuteur = setTimeout(async () => {
      const err = await enregistrerReponses(consultationId, reponses)
      if (err) setEtat({ message: '', erreur: `Enregistrement impossible : ${err.message}` })
    }, 1200)
    return () => clearTimeout(minuteur)
  }, [reponses, pret, consultationId])

  const definir = useCallback(
    (itemId, champs) =>
      setReponses((r) => ({
        ...r,
        [itemId]: { etat: 'non_explore', valeur: '', remarque: '', ...r[itemId], ...champs },
      })),
    []
  )

  const toutAbsent = (section) =>
    setReponses((r) => {
      const copie = { ...r }
      // Les signes déjà notés présents ne sont pas écrasés
      section.items
        .filter((i) => i.type === 'booleen')
        .forEach((i) => {
          if (copie[i.id]?.etat === 'presente') return
          copie[i.id] = { valeur: '', remarque: '', ...copie[i.id], etat: 'absente' }
        })
      return copie
    })

  /* ---- navigation clavier : +, -, 0 pour l'état, flèches pour se déplacer ---- */
  const ordreItems = useMemo(
    () => sections.flatMap((s) => s.items.map((i) => `${s.id}|${i.id}`)),
    [sections]
  )

  const auClavier = (cle, itemId, type) => (e) => {
    if (type !== 'booleen') return
    const idx = ordreItems.indexOf(cle)
    const aller = (n) => {
      const suivant = refs.current[ordreItems[n]]
      if (suivant) suivant.focus()
    }
    if (e.key === '+' || e.key === '1') {
      e.preventDefault()
      definir(itemId, { etat: 'presente' })
      aller(idx + 1)
    } else if (e.key === '-' || e.key === '2') {
      e.preventDefault()
      definir(itemId, { etat: 'absente' })
      aller(idx + 1)
    } else if (e.key === '0' || e.key === 'Backspace') {
      e.preventDefault()
      definir(itemId, { etat: 'non_explore' })
      aller(idx + 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      aller(idx + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      aller(idx - 1)
    }
  }

  /* Répondre « Diabète connu » ouvre la rubrique de suivi plus bas dans
     la page : on y amène le médecin au lieu de le laisser la chercher. */
  useEffect(() => {
    if (!pret) return
    const visibles = sections.map((s) => s.id)
    const avant = vuesPrecedentes.current
    vuesPrecedentes.current = visibles
    if (!avant) return
    const nouvelle = visibles.find((id) => !avant.includes(id))
    if (!nouvelle) return
    const el = ancres.current[nouvelle]
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [sections, pret])

  const { faits, total } = progression(sections, reponses)
  const texte = composerTexte(sections, reponses)

  useEffect(() => {
    onProgression?.({ faits, total })
  }, [faits, total, onProgression])

  const valider = async () => {
    const err = await enregistrerReponses(consultationId, reponses)
    if (err) {
      setEtat({ message: '', erreur: `Enregistrement impossible : ${err.message}` })
      return
    }
    onValider?.(composerParDestination(sections, reponses))
  }

  const enregistrerMaintenant = async () => {
    const err = await enregistrerReponses(consultationId, reponses)
    setEtat(err ? { message: '', erreur: err.message } : { message: 'Interrogatoire enregistré.', erreur: '' })
    setTimeout(() => setEtat((x) => ({ ...x, message: '' })), 2400)
  }

  if (!motifs.length)
    return (
      <p className="px-4 py-8 text-center text-[12.5px] text-encre/55">
        Aucun motif retenu pour cette consultation.
      </p>
    )

  return (
    <div className="flex min-h-0 flex-col">
      {/* ------------------------------------------------------- barre d'état */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-sarcelle-100 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="flex min-w-[150px] flex-1 items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-sarcelle-100">
            <div
              className="h-full rounded-full bg-sarcelle transition-all"
              style={{ width: total ? `${(faits / total) * 100}%` : '0%' }}
            />
          </div>
          <span className="tabular font-mono text-[11px] text-encre/55">
            {faits}/{total}
          </span>
        </div>
        <button onClick={() => setAide((v) => !v)} className="btn-fantome text-[12px]">
          <Keyboard className="h-[14px] w-[14px]" /> Clavier
        </button>
        <button onClick={enregistrerMaintenant} className="btn-secondaire">
          <Save className="h-[14px] w-[14px]" /> Enregistrer
        </button>
      </div>

      {aide && (
        <p className="border-b border-sarcelle-100 bg-sarcelle-50/60 px-3 py-2 text-[12px] text-encre/70">
          Sur un signe : <kbd className="font-mono font-semibold">+</kbd> présent ·{' '}
          <kbd className="font-mono font-semibold">−</kbd> absent ·{' '}
          <kbd className="font-mono font-semibold">0</kbd> non exploré. Le curseur descend tout
          seul. <kbd className="font-mono font-semibold">↑</kbd>{' '}
          <kbd className="font-mono font-semibold">↓</kbd> pour se déplacer sans répondre.
        </p>
      )}

      {etat.erreur && (
        <div className="px-3 pt-3">
          <Alerte>{etat.erreur}</Alerte>
        </div>
      )}

      {/* ---------------------------------------------------------- sections */}
      <div className="min-h-0 flex-1 overflow-y-auto fin px-3 py-3">
        <div className="space-y-4">
          {sections.map((s, idx) => (
            <section key={s.id} ref={(el) => (ancres.current[s.id] = el)}>
              {/* Un volet regroupant plusieurs rubriques n'affiche son
                  titre qu'une fois, au-dessus de la première. */}
              {s.groupe && s.groupe !== sections[idx - 1]?.groupe && (
                <h2 className="mb-2 mt-5 border-b border-sarcelle-100 pb-1 text-[12.5px] font-semibold uppercase tracking-[.08em] text-sarcelle-600">
                  {s.groupe}
                </h2>
              )}
              <header className="mb-1.5 flex flex-wrap items-center gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[.07em] text-ardoise">
                  {s.titre}
                </h3>
                <span className="text-[10.5px] text-encre/40">{s.grille}</span>
                {s.a_valider && (
                  <span className="puce bg-panneau-jaune text-[#75651a]">à valider</span>
                )}
                {s.items.some((i) => i.type === 'booleen') && (
                  <button
                    onClick={() => toutAbsent(s)}
                    className="ml-auto text-[11px] text-sarcelle-600 hover:underline"
                  >
                    tout marquer absent
                  </button>
                )}
              </header>

              <div className="overflow-hidden rounded-xs border border-sarcelle-100 bg-white">
                {s.items.map((i, k) => {
                  const cle = `${s.id}|${i.id}`
                  const r = reponses[i.id] ?? { etat: 'non_explore', valeur: '', remarque: '' }

                  // Champ libre de fin de rubrique : pleine largeur, détaché du
                  // reste. L'intitulé affiché est fixé ici — en base l'item
                  // garde son libellé « Autres ».
                  if (i.categorie === 'autre') {
                    return (
                      <div
                        key={cle}
                        className={`bg-sarcelle-50/50 px-2.5 py-2 ${k ? 'border-t border-sarcelle-100/70' : ''}`}
                      >
                        <label className="block">
                          <span className="etiquette mb-1">Autre (préciser)</span>
                          <textarea
                            className="champ fin resize-y bg-white"
                            rows={2}
                            value={r.valeur ?? ''}
                            onChange={(e) =>
                              definir(i.id, { valeur: e.target.value, etat: 'presente' })
                            }
                            placeholder="Tout élément de cette rubrique qui n’apparaît pas ci-dessus"
                          />
                        </label>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={cle}
                      className={`flex flex-wrap items-center gap-2 px-2.5 py-[6px] ${
                        k ? 'border-t border-sarcelle-100/70' : ''
                      }`}
                    >
                      <span
                        className={`min-w-[150px] flex-1 text-[12.5px] ${
                          r.etat === 'non_explore' && !r.valeur ? 'text-encre/70' : 'text-encre'
                        }`}
                      >
                        {i.libelle}
                        {i.mutualise && (
                          <Link2
                            className="ml-1 inline h-[11px] w-[11px] text-sarcelle-400"
                            title="Question commune à plusieurs motifs : une seule réponse"
                          />
                        )}
                      </span>

                      {i.type === 'booleen' ? (
                        <>
                          <span className="flex gap-1">
                            {['presente', 'absente', 'non_explore'].map((v) => {
                              const actif = r.etat === v
                              const d = ETATS[v]
                              return (
                                <button
                                  key={v}
                                  ref={v === 'presente' ? (el) => (refs.current[cle] = el) : undefined}
                                  onClick={() => definir(i.id, { etat: v })}
                                  onKeyDown={auClavier(cle, i.id, i.type)}
                                  aria-pressed={actif}
                                  aria-label={`${i.libelle} : ${
                                    v === 'presente' ? 'présent' : v === 'absente' ? 'absent' : 'non exploré'
                                  }`}
                                  className={`h-[24px] w-[28px] rounded-xs border font-mono text-[13px] leading-none transition ${
                                    actif ? d.classe : 'border-sarcelle-100 bg-white text-encre/25 hover:border-sarcelle-400'
                                  }`}
                                >
                                  {d.symbole}
                                </button>
                              )
                            })}
                          </span>
                          {r.etat === 'presente' && (
                            <input
                              className="champ w-full py-[3px] sm:w-40"
                              placeholder="précision"
                              value={r.remarque ?? ''}
                              onChange={(e) => definir(i.id, { remarque: e.target.value })}
                            />
                          )}
                        </>
                      ) : i.type === 'choix' ? (
                        <select
                          className="champ w-full py-[3px] sm:w-56"
                          value={r.valeur ?? ''}
                          onChange={(e) => definir(i.id, { valeur: e.target.value, etat: 'presente' })}
                        >
                          <option value="">—</option>
                          {(i.options ?? []).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : i.type === 'date' ? (
                        <input
                          type="date"
                          className="champ w-full py-[3px] sm:w-40"
                          value={r.valeur ?? ''}
                          onChange={(e) => definir(i.id, { valeur: e.target.value, etat: 'presente' })}
                        />
                      ) : i.type === 'nombre' ? (
                        <span className="relative">
                          <input
                            inputMode="decimal"
                            className="champ w-28 py-[3px] pr-9 text-right"
                            value={r.valeur ?? ''}
                            onChange={(e) => definir(i.id, { valeur: e.target.value, etat: 'presente' })}
                          />
                          {i.unite && (
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-encre/40">
                              {i.unite}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                          <input
                            className="champ w-full py-[3px] sm:w-64"
                            value={r.valeur ?? ''}
                            onChange={(e) => definir(i.id, { valeur: e.target.value, etat: 'presente' })}
                          />
                          {(memoire[i.id] ?? [])
                            .filter((p) => p.valeur !== r.valeur)
                            .map((p) => (
                              <button
                                key={p.valeur}
                                onClick={() => definir(i.id, { valeur: p.valeur, etat: 'presente' })}
                                title={
                                  p.patient
                                    ? `Déjà écrit pour ce patient · employé ${p.n} fois`
                                    : `Employé ${p.n} fois`
                                }
                                className={`max-w-[180px] shrink-0 truncate rounded-full border px-2 py-[2px] text-[10.5px] transition ${
                                  p.patient
                                    ? 'border-sarcelle-400 bg-sarcelle-50 text-sarcelle-600'
                                    : 'border-sarcelle-100 bg-white text-ardoise hover:border-sarcelle-400'
                                }`}
                              >
                                {p.patient && '• '}
                                {p.valeur}
                                {!p.patient && p.n > 1 && (
                                  <span className="ml-1 font-mono text-[9px] text-encre/40">{p.n}</span>
                                )}
                              </button>
                            ))}

                          {i.code === 'traitement_en_cours' &&
                            traitementAnterieur &&
                            !String(r.valeur ?? '').trim() && (
                              <button
                                onClick={() =>
                                  definir(i.id, { valeur: traitementAnterieur, etat: 'presente' })
                                }
                                title={traitementAnterieur}
                                className="shrink-0 whitespace-nowrap rounded-full border border-sarcelle-100 bg-white px-2 py-[2px] text-[10.5px] text-sarcelle-600 transition hover:border-sarcelle-400"
                              >
                                <CornerDownLeft className="mr-1 inline h-[10px] w-[10px]" />
                                dernière ordonnance
                              </button>
                            )}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ insertion dans la fiche */}
      <div className="border-t border-sarcelle-100 bg-sarcelle-50/50 px-3 py-2.5">
        {etat.message && (
          <p className="mb-1.5 text-[12px] font-medium text-[#2c6435]">{etat.message}</p>
        )}
        {onValider ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11.5px] text-encre/55">
              {faits === 0
                ? 'Aucune question renseignée pour le moment.'
                : `${faits} question${faits > 1 ? 's' : ''} renseignée${faits > 1 ? 's' : ''} sur ${total}.`}
            </span>
            <button onClick={valider} className="btn-primaire ml-auto">
              Valider l’interrogatoire <ArrowRight className="h-[14px] w-[14px]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-encre/55">Verser le texte composé dans :</span>
            <button
              onClick={() => onInserer?.('histoire_maladie', texte)}
              disabled={!texte}
              className="btn-secondaire"
            >
              <ArrowDownToLine className="h-[13px] w-[13px]" /> Histoire de la maladie
            </button>
            <button
              onClick={() => onInserer?.('examen_clinique', texte)}
              disabled={!texte}
              className="btn-secondaire"
            >
              <ArrowDownToLine className="h-[13px] w-[13px]" /> Examen clinique
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
