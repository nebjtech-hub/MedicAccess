import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Info, Link2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { chargerBilans } from '../lib/interrogatoire'
import { memoriserSaisie } from '../lib/saisie'
import { Modale, Alerte, Case, Puce } from './ui'
import { ChampSuggere } from './ChampsAssistes'
import { dateHeureFr } from '../lib/format'

const LIGNE_VIDE = { libelle: '', code: '', urgent: false }

export default function ExamensModale({
  ouverte, onFermer, type, consultation, patient, medecin,
  grilles = [], motifs = [], onEnregistre,
}) {
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }])
  const [existants, setExistants] = useState([])
  const [blocs, setBlocs] = useState([])
  const [coches, setCoches] = useState({})
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!ouverte || !consultation?.id) return
    setLignes([{ ...LIGNE_VIDE }])
    setErreur('')

    supabase
      .from('examens_demandes')
      .select('*')
      .eq('consultation_id', consultation.id)
      .eq('type', type)
      .order('date_demande')
      .then(({ data }) => setExistants(data ?? []))

    chargerBilans(grilles, motifs)
      .then((b) => {
        const filtres = b
          .map((x) => ({ ...x, examens: x.examens.filter((e) => e.type === type) }))
          .filter((x) => x.examens.length)
        setBlocs(filtres)

        // Le socle est pré-coché ; les conditionnels et les doublons non.
        const init = {}
        filtres.forEach((x) =>
          x.examens.forEach((e) => {
            init[e.id] = !e.conditionnel && !e.doublon && !x.a_valider
          })
        )
        setCoches(init)
      })
      .catch(() => setBlocs([]))
  }, [ouverte, consultation?.id, type, grilles, JSON.stringify(motifs)])

  const maj = (i, champ) => (valeur) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))

  const selection = blocs.flatMap((b) =>
    b.examens.filter((e) => coches[e.id] && !e.doublon)
  )

  const enregistrer = async () => {
    const libres = lignes.filter((l) => l.libelle.trim())
    const total = [
      ...selection.map((e) => ({ libelle: e.libelle, code: e.code, urgent: false })),
      ...libres.map((l) => ({ libelle: l.libelle.trim(), code: l.code.trim() || null, urgent: l.urgent })),
    ]
    if (!total.length) {
      setErreur('Sélectionnez au moins un examen.')
      return
    }
    setEnvoi(true)
    setErreur('')
    const { data, error } = await supabase
      .from('examens_demandes')
      .insert(
        total.map((e) => ({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          type,
          libelle: e.libelle,
          code: e.code,
          urgent: e.urgent,
        }))
      )
      .select('id')

    setEnvoi(false)
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      return
    }
    libres.forEach((l) => memoriserSaisie('examen', l.libelle))
    onEnregistre?.(data?.length ?? total.length)
  }

  const supprimerExistant = async (id) => {
    await supabase.from('examens_demandes').delete().eq('id', id)
    setExistants((l) => l.filter((x) => x.id !== id))
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={type === 'Imagerie' ? "Demande d'imagerie" : "Demande d'examens de laboratoire"}
      sous={`${patient?.nom ?? ''} ${patient?.prenom ?? ''} — dossier ${patient?.code ?? ''}`}
      taille="lg"
      pied={
        <>
          <span className="mr-auto text-[11.5px] text-encre/55">
            {selection.length + lignes.filter((l) => l.libelle.trim()).length} examen(s) à prescrire
          </span>
          <button onClick={onFermer} className="btn-fantome">
            Fermer
          </button>
          <button onClick={enregistrer} disabled={envoi} className="btn-primaire">
            <Save className="h-[14px] w-[14px]" /> {envoi ? 'Enregistrement…' : 'Enregistrer la demande'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {erreur && <Alerte>{erreur}</Alerte>}

        {existants.length > 0 && (
          <div>
            <p className="etiquette mb-1.5">Déjà demandés pour cette consultation</p>
            <ul className="divide-y divide-sarcelle-100 rounded-xs border border-sarcelle-100">
              {existants.map((x) => (
                <li key={x.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px]">
                  <span className="flex-1 truncate">
                    {x.libelle}
                    {x.urgent && <span className="ml-1.5 font-semibold text-alerte">urgent</span>}
                  </span>
                  <span className="hidden text-[11px] text-encre/45 sm:block">
                    {dateHeureFr(x.date_demande)}
                  </span>
                  <Puce>{x.statut}</Puce>
                  <button onClick={() => supprimerExistant(x.id)}
                    className="text-encre/25 transition hover:text-alerte"
                    aria-label={`Retirer ${x.libelle}`}>
                    <Trash2 className="h-[13px] w-[13px]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ------------------------------------------- bilans proposés par motif */}
        {blocs.map((b) => (
          <div key={b.id}>
            <p className="etiquette mb-1.5 flex flex-wrap items-center gap-2">
              {b.titre}
              <span className="font-normal normal-case tracking-normal text-encre/45">
                {b.grille?.nom}
              </span>
              {b.a_valider && (
                <span className="puce bg-panneau-jaune text-[#75651a]">proposition à valider</span>
              )}
            </p>
            <ul className="divide-y divide-sarcelle-100 rounded-xs border border-sarcelle-100">
              {b.examens.map((e) => (
                <li
                  key={e.id}
                  className={`flex flex-wrap items-center gap-2 px-2.5 py-[5px] ${
                    e.doublon ? 'bg-black/[.02]' : ''
                  }`}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-[12.5px]">
                    <input
                      type="checkbox"
                      className="h-[15px] w-[15px] rounded-xs accent-[#0E7C86]"
                      checked={!!coches[e.id] && !e.doublon}
                      disabled={e.doublon}
                      onChange={(ev) => setCoches((c) => ({ ...c, [e.id]: ev.target.checked }))}
                    />
                    <span className={e.doublon ? 'text-encre/45 line-through' : ''}>{e.libelle}</span>
                    {e.code && (
                      <span className="font-mono text-[10.5px] text-encre/35">{e.code}</span>
                    )}
                  </label>

                  {e.doublon && (
                    <span className="flex items-center gap-1 text-[11px] text-sarcelle-600">
                      <Link2 className="h-[11px] w-[11px]" /> déjà dans {e.dejaDans}
                    </span>
                  )}
                  {e.conditionnel && !e.doublon && (
                    <span className="flex items-center gap-1 text-[11px] italic text-encre/55">
                      <Info className="h-[11px] w-[11px] shrink-0" /> {e.condition}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {blocs.length === 0 && motifs.length > 0 && (
          <p className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/50 px-3 py-2 text-[12px] text-encre/60">
            Aucun bilan de {type.toLowerCase()} n’est associé aux motifs retenus. Saisissez les
            examens ci-dessous.
          </p>
        )}

        {/* ----------------------------------------------------- saisie libre */}
        <div className="space-y-2">
          <p className="etiquette">Ajouter un examen</p>
          {lignes.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <ChampSuggere
                  domaine="examen"
                  valeur={l.libelle}
                  onChange={maj(i, 'libelle')}
                  memoriser={false}
                  placeholder={type === 'Imagerie' ? 'Échographie abdominale' : 'Numération formule sanguine'}
                />
              </div>
              <input className="champ w-24" value={l.code}
                onChange={(e) => maj(i, 'code')(e.target.value)} placeholder="Code" />
              <Case label="Urgent" checked={l.urgent}
                onChange={(e) => maj(i, 'urgent')(e.target.checked)} />
              <button onClick={() => setLignes((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))}
                className="btn-fantome px-1.5" aria-label="Supprimer la ligne">
                <Trash2 className="h-[13px] w-[13px]" />
              </button>
            </div>
          ))}
          <button onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="btn-secondaire">
            <Plus className="h-[14px] w-[14px]" /> Ajouter une ligne
          </button>
        </div>
      </div>
    </Modale>
  )
}
