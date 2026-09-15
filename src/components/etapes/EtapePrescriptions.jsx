import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Plus, Trash2, Info, Link2, Pill, FlaskConical,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { chargerBilans } from '../../lib/interrogatoire'
import { memoriserSaisie } from '../../lib/saisie'
import { Carte, Alerte, Case, Choix } from '../ui'
import { ChampSuggere, ZoneAssistee } from '../ChampsAssistes'

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Sachet', 'Injectable', 'Suppositoire', 'Pommade', 'Collyre']
const LIGNE_VIDE = { medicament: '', dosage: '', forme: '', posologie: '', duree: '', quantite: '', instructions: '' }

export default function EtapePrescriptions({
  consultation, setConsultation, patient, medecin, grilles, motifs, onValider, onRetour,
}) {
  const [blocs, setBlocs] = useState([])
  const [coches, setCoches] = useState({})
  const [libres, setLibres] = useState([])
  const [protocoles, setProtocoles] = useState([])
  const [lignes, setLignes] = useState([])
  const [noteOrdonnance, setNoteOrdonnance] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  /* ------------------------------------------------ bilans et protocoles */
  useEffect(() => {
    chargerBilans(grilles, motifs)
      .then((b) => {
        setBlocs(b)
        const init = {}
        b.forEach((x) =>
          x.examens.forEach((e) => {
            // Socle pré-coché ; conditionnels, doublons et propositions non validées : non.
            init[e.id] = !e.conditionnel && !e.doublon && !x.a_valider
          })
        )
        setCoches(init)
      })
      .catch(() => setBlocs([]))

    const ids = grilles.filter((g) => motifs.includes(g.code)).map((g) => g.id)
    if (ids.length) {
      supabase
        .from('protocoles')
        .select('id, nom, indication, grille:grilles(nom), lignes:protocoles_lignes(*)')
        .in('grille_id', ids)
        .eq('actif', true)
        .then(({ data }) => setProtocoles(data ?? []))
    }
  }, [grilles, JSON.stringify(motifs)])

  const appliquerProtocole = (p) =>
    setLignes((l) => [
      ...l,
      ...(p.lignes ?? [])
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map(({ id, protocole_id, ordre, ...reste }) => ({ ...LIGNE_VIDE, ...reste })),
    ])

  const majLigne = (i, champ) => (valeur) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))

  const selection = blocs.flatMap((b) => b.examens.filter((e) => coches[e.id] && !e.doublon))
  const medicaments = lignes.filter((l) => l.medicament.trim())

  /* ---------------------------------------------------------- enregistrement */
  const valider = async () => {
    if (!String(consultation.diagnostic ?? '').trim()) {
      setErreur('Le diagnostic est nécessaire pour générer le compte rendu.')
      return
    }
    setEnvoi(true)
    setErreur('')

    await supabase.from('examens_demandes').delete().eq('consultation_id', consultation.id)
    const examens = [
      ...selection.map((e) => ({ libelle: e.libelle, code: e.code, type: e.type, urgent: false })),
      ...libres
        .filter((l) => l.libelle.trim())
        .map((l) => ({ libelle: l.libelle.trim(), code: null, type: l.type, urgent: l.urgent })),
    ]
    if (examens.length) {
      const { error } = await supabase.from('examens_demandes').insert(
        examens.map((e) => ({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          type: e.type ?? 'Laboratoire',
          libelle: e.libelle,
          code: e.code,
          urgent: e.urgent,
        }))
      )
      if (error) {
        setErreur(`Les examens n’ont pas pu être enregistrés : ${error.message}`)
        setEnvoi(false)
        return
      }
    }

    await supabase.from('ordonnances').delete().eq('consultation_id', consultation.id)
    if (medicaments.length) {
      const { data, error } = await supabase
        .from('ordonnances')
        .insert({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          note: noteOrdonnance.trim() || null,
        })
        .select('id')
        .single()
      if (error) {
        setErreur(`L’ordonnance n’a pas pu être enregistrée : ${error.message}`)
        setEnvoi(false)
        return
      }
      await supabase.from('ordonnance_lignes').insert(
        medicaments.map((l, i) => ({
          ordonnance_id: data.id,
          medicament: l.medicament.trim(),
          dosage: l.dosage.trim() || null,
          forme: l.forme || null,
          posologie: l.posologie.trim() || null,
          duree: l.duree.trim() || null,
          quantite: l.quantite.trim() || null,
          instructions: l.instructions.trim() || null,
          ordre: i,
        }))
      )
      medicaments.forEach((l) => memoriserSaisie('medicament', l.medicament.trim()))
    }

    setEnvoi(false)
    onValider()
  }

  return (
    <div className="space-y-3">
      {erreur && <Alerte>{erreur}</Alerte>}

      {/* ======================================================= 1. clinique */}
      <Carte titre="Examen clinique" sous="Constatations à l’examen physique du patient.">
        <div className="space-y-3 p-4">
          <ZoneAssistee
            rows={4}
            valeur={consultation.examen_clinique ?? ''}
            onChange={(v) => setConsultation((c) => ({ ...c, examen_clinique: v }))}
            placeholder="Inspection, palpation, auscultation — tapez « ecn » puis espace pour une phrase type"
          />
          <div>
            <span className="etiquette mb-1">
              Examen paraclinique
              <Link to={`/examens/${patient?.id}`} className="ml-2 font-normal normal-case tracking-normal text-sarcelle hover:underline">
                voir les résultats du patient
              </Link>
            </span>
            <ZoneAssistee
              rows={3}
              valeur={consultation.examen_paraclinique ?? ''}
              onChange={(v) => setConsultation((c) => ({ ...c, examen_paraclinique: v }))}
              placeholder="Résultats de biologie, imagerie, ECG"
            />
          </div>
        </div>
      </Carte>

      {/* ====================================================== 3. diagnostic */}
      <Carte titre="Diagnostic retenu" sous="Saisie libre.">
        <div className="p-4">
          <ZoneAssistee
            rows={4}
            valeur={consultation.diagnostic ?? ''}
            onChange={(v) => setConsultation((c) => ({ ...c, diagnostic: v }))}
            placeholder="Diagnostic retenu, diagnostics différentiels"
          />
        </div>
      </Carte>

      {/* ============================================ 4. examens paracliniques */}
      <Carte
        titre="Examens proposés"
        sous={
          blocs.length
            ? 'Examens paracliniques. Le socle est pré-coché ; les conditionnels et les doublons ne le sont pas.'
            : 'Aucun bilan n’est rattaché aux motifs retenus.'
        }
        action={
          <span className="tabular text-[11.5px] text-encre/55">
            <FlaskConical className="mr-1 inline h-[13px] w-[13px]" />
            {selection.length + libres.filter((l) => l.libelle.trim()).length} à prescrire
          </span>
        }
      >
        <div className="space-y-3 p-4">
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
                      <span className={e.doublon ? 'text-encre/45 line-through' : ''}>
                        {e.libelle}
                      </span>
                      {e.type === 'Imagerie' && (
                        <span className="puce bg-sarcelle-100 text-sarcelle-600">imagerie</span>
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

          {libres.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <ChampSuggere
                  domaine="examen"
                  valeur={l.libelle}
                  memoriser={false}
                  onChange={(v) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, libelle: v } : y)))}
                  placeholder="Autre examen"
                />
              </div>
              <Choix
                vide={null}
                options={['Laboratoire', 'Imagerie']}
                value={l.type}
                onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, type: e.target.value } : y)))}
                className="w-36"
              />
              <Case
                label="Urgent"
                checked={l.urgent}
                onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, urgent: e.target.checked } : y)))}
              />
              <button onClick={() => setLibres((x) => x.filter((_, j) => j !== i))}
                className="btn-fantome px-1.5" aria-label="Retirer">
                <Trash2 className="h-[13px] w-[13px]" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setLibres((l) => [...l, { libelle: '', type: 'Laboratoire', urgent: false }])}
            className="btn-secondaire"
          >
            <Plus className="h-[14px] w-[14px]" /> Autre examen hors bilan
          </button>
        </div>
      </Carte>

      {/* ====================================================== 5. ordonnance */}
      <Carte
        titre="Ordonnance"
        sous="Rien n’est pré-rempli : le traitement reste votre décision."
        action={
          <span className="tabular text-[11.5px] text-encre/55">
            <Pill className="mr-1 inline h-[13px] w-[13px]" />
            {medicaments.length} médicament{medicaments.length > 1 ? 's' : ''}
          </span>
        }
      >
        <div className="space-y-3 p-4">
          {protocoles.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xs border border-sarcelle-100 bg-sarcelle-50/50 px-3 py-2">
              <span className="text-[11.5px] text-encre/60">Vos protocoles pour ces motifs :</span>
              {protocoles.map((p) => (
                <button key={p.id} onClick={() => appliquerProtocole(p)} title={p.indication ?? ''}
                  className="rounded-full border border-sarcelle-100 bg-white px-2.5 py-[3px] text-[11.5px] text-ardoise transition hover:border-sarcelle-400">
                  {p.nom}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/50 px-3 py-2 text-[12px] text-encre/60">
              Aucun protocole enregistré pour ces motifs.{' '}
              <Link to="/protocoles" className="font-medium text-sarcelle underline underline-offset-2">
                Créer un protocole réutilisable
              </Link>
              .
            </p>
          )}

          {lignes.length > 0 && (
            <div className="overflow-x-auto fin rounded-xs border border-sarcelle-100">
              <table className="grille min-w-[820px]">
                <thead>
                  <tr>
                    <th className="w-[22%]">Médicament</th>
                    <th className="w-[11%]">Dosage</th>
                    <th className="w-[12%]">Forme</th>
                    <th className="w-[18%]">Posologie</th>
                    <th className="w-[11%]">Durée</th>
                    <th className="w-[9%]">Quantité</th>
                    <th>Instructions</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr key={i}>
                      <td>
                        <ChampSuggere domaine="medicament" valeur={l.medicament} memoriser={false}
                          onChange={majLigne(i, 'medicament')} placeholder="Nom" />
                      </td>
                      <td>
                        <input className="champ py-[3px]" value={l.dosage}
                          onChange={(e) => majLigne(i, 'dosage')(e.target.value)} placeholder="500 mg" />
                      </td>
                      <td>
                        <select className="champ py-[3px]" value={l.forme}
                          onChange={(e) => majLigne(i, 'forme')(e.target.value)}>
                          <option value="">—</option>
                          {FORMES.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="champ py-[3px]" value={l.posologie}
                          onChange={(e) => majLigne(i, 'posologie')(e.target.value)} placeholder="1 cp × 2/jour" />
                      </td>
                      <td>
                        <input className="champ py-[3px]" value={l.duree}
                          onChange={(e) => majLigne(i, 'duree')(e.target.value)} placeholder="3 mois" />
                      </td>
                      <td>
                        <input className="champ py-[3px]" value={l.quantite}
                          onChange={(e) => majLigne(i, 'quantite')(e.target.value)} />
                      </td>
                      <td>
                        <input className="champ py-[3px]" value={l.instructions}
                          onChange={(e) => majLigne(i, 'instructions')(e.target.value)} placeholder="Au repas" />
                      </td>
                      <td>
                        <button onClick={() => setLignes((x) => x.filter((_, j) => j !== i))}
                          className="text-encre/25 transition hover:text-alerte" aria-label="Retirer">
                          <Trash2 className="h-[13px] w-[13px]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="btn-secondaire">
              <Plus className="h-[14px] w-[14px]" /> Ajouter un médicament
            </button>
            {lignes.length > 0 && (
              <input className="champ min-w-[220px] flex-1"
                placeholder="Note au pharmacien (ne pas substituer…)"
                value={noteOrdonnance} onChange={(e) => setNoteOrdonnance(e.target.value)} />
            )}
          </div>
        </div>
      </Carte>

      {/* ================================================ 6. conduite à tenir */}
      <Carte titre="Conduite à tenir" sous="Suivi, mesures hygiéno-diététiques, orientation.">
        <div className="p-4">
          <ZoneAssistee
            rows={3}
            valeur={consultation.conduite_a_tenir ?? ''}
            onChange={(v) => setConsultation((c) => ({ ...c, conduite_a_tenir: v }))}
            placeholder="« cat » puis espace déplie une phrase type"
          />
        </div>
      </Carte>

      <div className="flex items-center justify-between gap-2">
        <button onClick={onRetour} className="btn-secondaire">
          <ArrowLeft className="h-[14px] w-[14px]" /> Interrogatoire
        </button>
        <button onClick={valider} disabled={envoi} className="btn-primaire">
          {envoi ? 'Enregistrement…' : 'Générer le compte rendu'}
          <ArrowRight className="h-[14px] w-[14px]" />
        </button>
      </div>
    </div>
  )
}
