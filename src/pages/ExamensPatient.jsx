import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, FolderOpen, AlertTriangle, TrendingUp, TrendingDown, Minus, FlaskConical,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateFr, age, initiales } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { Carte, Chargement, Vide, Alerte, Puce } from '../components/ui'
import { BoutonExport } from '../components/DataToolbar'

/** Extrait la première valeur numérique d'un résultat saisi librement. */
const valeurNumerique = (s) => {
  const m = String(s ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export default function ExamensPatient() {
  const { patientId } = useParams()
  const [patient, setPatient] = useState(null)
  const [examens, setExamens] = useState([])
  const [saisies, setSaisies] = useState({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  const charger = useCallback(async () => {
    const [p, e] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).maybeSingle(),
      supabase
        .from('examens_demandes')
        .select('*, consultation:consultations(numero, date_consultation)')
        .eq('patient_id', patientId)
        .order('date_demande', { ascending: false }),
    ])
    setPatient(p.data)
    setExamens(e.data ?? [])
    setChargement(false)
  }, [patientId])

  useEffect(() => {
    charger()
  }, [charger])

  const enregistrer = async (ex) => {
    const v = (saisies[ex.id] ?? '').trim()
    if (!v) return
    const { error } = await supabase
      .from('examens_demandes')
      .update({ resultat: v, statut: 'Résultat disponible', date_resultat: new Date().toISOString() })
      .eq('id', ex.id)
    if (error) {
      setErreur(`Résultat non enregistré : ${error.message}`)
      return
    }
    setErreur('')
    setExamens((l) =>
      l.map((x) =>
        x.id === ex.id
          ? { ...x, resultat: v, statut: 'Résultat disponible', date_resultat: new Date().toISOString() }
          : x
      )
    )
    setSaisies((s) => ({ ...s, [ex.id]: '' }))
    setMessage(`${ex.libelle} enregistré.`)
    setTimeout(() => setMessage(''), 2400)
  }

  const corriger = async (ex, valeur) => {
    const { error } = await supabase
      .from('examens_demandes')
      .update({ resultat: valeur, date_resultat: new Date().toISOString() })
      .eq('id', ex.id)
    if (error) setErreur(`Correction non enregistrée : ${error.message}`)
    else setExamens((l) => l.map((x) => (x.id === ex.id ? { ...x, resultat: valeur } : x)))
  }

  const attente = examens.filter((x) => x.statut !== 'Résultat disponible')

  /* Historique par examen : c'est là qu'on lit l'évolution du patient. */
  const historique = useMemo(() => {
    const par = new Map()
    examens
      .filter((x) => x.statut === 'Résultat disponible' && x.resultat)
      .forEach((x) => {
        const cle = x.libelle
        if (!par.has(cle)) par.set(cle, [])
        par.get(cle).push(x)
      })
    return [...par.entries()]
      .map(([libelle, liste]) => ({
        libelle,
        type: liste[0].type,
        valeurs: liste.sort((a, b) => new Date(a.date_resultat) - new Date(b.date_resultat)),
      }))
      .sort((a, b) => b.valeurs.length - a.valeurs.length || a.libelle.localeCompare(b.libelle, 'fr'))
  }, [examens])

  /** Derniers résultats du même examen, pour situer la nouvelle valeur. */
  const anterieurs = (libelle) =>
    examens
      .filter((x) => x.libelle === libelle && x.statut === 'Résultat disponible' && x.resultat)
      .sort((a, b) => new Date(b.date_resultat) - new Date(a.date_resultat))
      .slice(0, 3)

  const exporter = () =>
    exporterExcel(
      examens.map((x) => ({
        'N° dossier': patient?.code ?? '',
        Patient: `${patient?.nom ?? ''} ${patient?.prenom ?? ''}`.trim(),
        'N° consultation': x.consultation?.numero ?? '',
        Type: x.type ?? '',
        Examen: x.libelle,
        Urgent: x.urgent ? 'Oui' : '',
        'Prescrit le': dateFr(x.date_demande),
        Statut: x.statut ?? '',
        Résultat: x.resultat ?? '',
        'Résultat le': dateFr(x.date_resultat),
      })),
      `examens_${patient?.code ?? 'patient'}`,
      'Examens'
    )

  if (chargement) return <Chargement texte="Chargement des examens…" />
  if (!patient)
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alerte>Patient introuvable.</Alerte>
        <Link to="/examens" className="btn-secondaire mt-4">
          Retour aux examens
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 lg:px-6">
      <Link to="/examens" className="btn-fantome -ml-2 mb-2 text-[12px]">
        <ArrowLeft className="h-3.5 w-3.5" /> Tous les examens
      </Link>

      {/* ------------------------------------------------------------ patient */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xs border border-sarcelle-100 bg-white px-4 py-3 shadow-fiche">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[12px] font-semibold text-sarcelle-600">
          {initiales(patient)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold tracking-tight text-ardoise">
            {patient.nom} {patient.prenom}
          </h1>
          <p className="truncate text-[11.5px] text-encre/55">
            <span className="font-mono">{patient.code}</span>
            {patient.date_naissance && ` · ${age(patient.date_naissance)} ans`}
            {patient.sexe && ` · ${patient.sexe}`}
            {` · ${examens.length} examen${examens.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <BoutonExport onClick={exporter} desactive={!examens.length} />
        <Link to={`/patients/${patient.id}`} className="btn-secondaire">
          <FolderOpen className="h-[14px] w-[14px]" /> Dossier
        </Link>
      </div>

      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}
      {message && (
        <div className="mb-3">
          <Alerte ton="succes">{message}</Alerte>
        </div>
      )}

      {/* -------------------------------------------- résultats à renseigner */}
      <Carte
        titre="Résultats à renseigner"
        sous={
          attente.length
            ? 'Les valeurs précédentes du même examen sont rappelées sous chaque ligne.'
            : 'Tous les examens prescrits ont leur résultat.'
        }
        className="mb-3"
      >
        {attente.length === 0 ? (
          <Vide icone={Check} titre="Rien en attente" texte="Aucun résultat à saisir pour ce patient." />
        ) : (
          <ul className="divide-y divide-sarcelle-100">
            {attente.map((ex) => {
              const passe = anterieurs(ex.libelle)
              return (
                <li key={ex.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-[170px] flex-1">
                      <span className="block text-[13px] font-medium text-ardoise">
                        {ex.libelle}
                        {ex.urgent && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-alerte">
                            <AlertTriangle className="h-[11px] w-[11px]" /> urgent
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-encre/50">
                        {ex.type} · prescrit le {dateFr(ex.date_demande)}
                        {ex.consultation?.numero && ` · ${ex.consultation.numero}`}
                      </span>
                    </span>
                    <input
                      className="champ min-w-[180px] flex-1"
                      placeholder="Résultat (valeur et unité)"
                      value={saisies[ex.id] ?? ''}
                      onChange={(e) => setSaisies((s) => ({ ...s, [ex.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && enregistrer(ex)}
                    />
                    <button
                      onClick={() => enregistrer(ex)}
                      disabled={!(saisies[ex.id] ?? '').trim()}
                      className="btn-primaire"
                    >
                      <Check className="h-[13px] w-[13px]" /> Noter
                    </button>
                  </div>

                  {passe.length > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-encre/55">
                      <span className="text-encre/40">Précédemment :</span>
                      {passe.map((p) => (
                        <span key={p.id} className="font-mono">
                          {p.resultat}
                          <span className="ml-1 text-encre/35">{dateFr(p.date_resultat)}</span>
                        </span>
                      ))}
                      <Tendance
                        avant={passe[0]?.resultat}
                        apres={saisies[ex.id]}
                      />
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Carte>

      {/* ------------------------------------------------------- évolution */}
      <Carte
        titre="Évolution"
        sous="Chaque examen dans l’ordre chronologique. Les résultats restent modifiables."
      >
        {historique.length === 0 ? (
          <Vide
            icone={FlaskConical}
            titre="Aucun résultat enregistré"
            texte="L’évolution apparaîtra dès le premier résultat saisi."
          />
        ) : (
          <ul className="divide-y divide-sarcelle-100">
            {historique.map((h) => (
              <li key={h.libelle} className="px-4 py-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium text-ardoise">{h.libelle}</span>
                  <span className="text-[11px] text-encre/45">{h.type}</span>
                  {h.valeurs.length > 1 && (
                    <>
                      <span className="tabular text-[11px] text-encre/45">
                        {h.valeurs.length} mesures
                      </span>
                      <Tendance
                        avant={h.valeurs[h.valeurs.length - 2]?.resultat}
                        apres={h.valeurs[h.valeurs.length - 1]?.resultat}
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.valeurs.map((v, i) => (
                    <span
                      key={v.id}
                      className={`rounded-xs border px-2 py-1 text-[12px] ${
                        i === h.valeurs.length - 1
                          ? 'border-sarcelle-400 bg-sarcelle-50'
                          : 'border-sarcelle-100 bg-white'
                      }`}
                    >
                      <input
                        className="tabular w-24 bg-transparent font-mono text-[12px] outline-none"
                        defaultValue={v.resultat}
                        onBlur={(e) => {
                          const nv = e.target.value.trim()
                          if (nv && nv !== v.resultat) corriger(v, nv)
                        }}
                        aria-label={`${h.libelle} du ${dateFr(v.date_resultat)}`}
                      />
                      <span className="ml-1 block text-[10px] text-encre/45">
                        {dateFr(v.date_resultat)}
                      </span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  )
}

/**
 * Sens de variation entre deux résultats chiffrés. Volontairement neutre :
 * une hausse n'est ni bonne ni mauvaise selon l'examen, c'est au médecin
 * d'interpréter. On indique la direction, pas un jugement.
 */
function Tendance({ avant, apres }) {
  const a = valeurNumerique(avant)
  const b = valeurNumerique(apres)
  if (a === null || b === null) return null
  const ecart = b - a
  if (Math.abs(ecart) < 1e-9)
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-encre/45">
        <Minus className="h-[11px] w-[11px]" /> stable
      </span>
    )
  const pourcent = a !== 0 ? Math.round((ecart / Math.abs(a)) * 100) : null
  const Icone = ecart > 0 ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-sarcelle-600">
      <Icone className="h-[11px] w-[11px]" />
      {ecart > 0 ? '+' : ''}
      {Number(ecart.toFixed(2))}
      {pourcent !== null && ` (${pourcent > 0 ? '+' : ''}${pourcent} %)`}
    </span>
  )
}
