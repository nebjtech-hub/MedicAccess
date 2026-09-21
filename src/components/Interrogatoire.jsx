import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, ArrowDownToLine, ArrowRight, Save, Link2 } from 'lucide-react'
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
  consultationId, grilles, motifs, sexePatient, onInserer, onValider, onProgression,
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
          {sections.map((s) => (
            <section key={s.id}>
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
                        <input
                          className="champ w-full py-[3px] sm:w-64"
                          value={r.valeur ?? ''}
                          onChange={(e) => definir(i.id, { valeur: e.target.value, etat: 'presente' })}
                        />
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
