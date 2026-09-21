import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, ArrowRight, Stethoscope, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { chargerGrilles, enregistrerMotifs } from '../lib/interrogatoire'
import { age, dateFr, initiales } from '../lib/format'
import PatientPicker from '../components/PatientPicker'
import MotifSelector from '../components/MotifSelector'
import { ChampSuggere } from '../components/ChampsAssistes'
import { Carte, Alerte, Champ, Choix, Chargement } from '../components/ui'

const FONDS = [
  { value: 'GEF', label: 'GEF — Gabonais économiquement faibles' },
  { value: 'AP', label: 'AP — Agents publics' },
  { value: 'SP', label: 'SP — Secteur privé' },
]

const ORGANISMES = ['CNAMGS', 'Aucune', 'Autre']

const VIDE = {
  nom: '', prenom: '', sexe: '', date_naissance: '', age_saisi: '', age_presume: false,
  telephone: '',
  organisme_choix: 'CNAMGS', organisme_autre: '', numero_secu: '', fonds_cnamgs: '',
  ville: 'Libreville', quartier: '', adresse: '',
}

export default function NouvelleConsultation() {
  const navigate = useNavigate()
  const { medecin } = useAuth()

  const [etape, setEtape] = useState(1)
  const [patient, setPatient] = useState(null)
  const [creation, setCreation] = useState(false)
  const [f, setF] = useState(VIDE)
  const [grilles, setGrilles] = useState([])
  const [motifs, setMotifs] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    chargerGrilles()
      .then((g) => {
        setGrilles(g)
        setMotifs(g.filter((x) => x.defaut).map((x) => x.code))
        setChargement(false)
      })
      .catch((e) => {
        setErreur(
          'Les grilles d’interrogatoire ne sont pas chargées. Le script ' +
            `grilles_endocrinologie.sql a-t-il été exécuté dans Supabase ? (${e.message})`
        )
        setChargement(false)
      })
  }, [])

  const maj = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))

  /* L'âge seul suffit : beaucoup de patients ne connaissent pas leur date exacte. */
  const majAge = (e) => {
    const v = e.target.value
    const n = parseInt(v, 10)
    setF((x) =>
      !v || Number.isNaN(n)
        ? { ...x, age_saisi: v }
        : {
            ...x,
            age_saisi: v,
            age_presume: true,
            date_naissance: `${new Date().getFullYear() - n}-01-01`,
          }
    )
  }

  const ageAffiche = useMemo(
    () => (f.date_naissance && !f.age_presume ? age(f.date_naissance) : f.age_saisi),
    [f.date_naissance, f.age_presume, f.age_saisi]
  )

  /* ------------------------------------------------------- enregistrement */
  const creerPatient = async () => {
    if (!f.nom.trim()) {
      setErreur('Le nom du patient est obligatoire.')
      return null
    }
    const { age_saisi, organisme_choix, organisme_autre, ...champs } = f
    champs.organisme_assurance =
      organisme_choix === 'Autre' ? organisme_autre.trim() || 'Autre' : organisme_choix
    const charge = Object.fromEntries(
      Object.entries(champs).map(([k, v]) => [k, typeof v === 'string' && !v.trim() ? null : v])
    )
    charge.medecin_traitant = medecin?.id ?? null

    const { data, error } = await supabase.from('patients').insert(charge).select('*').single()
    if (error) {
      setErreur(`Le patient n’a pas pu être enregistré : ${error.message}`)
      return null
    }
    return data
  }

  const passerAuxMotifs = async () => {
    setErreur('')
    setEnvoi(true)
    const p = await creerPatient()
    setEnvoi(false)
    if (!p) return
    setPatient(p)
    setCreation(false)
    setEtape(2)
  }

  const ouvrirConsultation = async () => {
    setEnvoi(true)
    setErreur('')
    const { data, error } = await supabase
      .from('consultations')
      .insert({
        patient_id: patient.id,
        medecin_id: medecin?.id ?? null,
        date_consultation: new Date().toISOString(),
        etape: 'interrogatoire',
      })
      .select('id')
      .single()

    if (error) {
      setErreur(`La consultation n’a pas pu être ouverte : ${error.message}`)
      setEnvoi(false)
      return
    }
    await enregistrerMotifs(data.id, grilles, motifs)
    navigate(`/consultations/${data.id}`, { replace: true })
  }

  if (chargement) return <Chargement texte="Préparation de la consultation…" />

  return (
    <div className="mx-auto max-w-4xl px-3 py-7 lg:px-6">
      <Fil etape={etape} />

      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}

      {/* ============================================== étape 1 — le patient */}
      {etape === 1 &&
        (creation ? (
          <Carte
            titre="Nouveau patient"
            sous="Le strict nécessaire pour ouvrir la consultation. Le reste du dossier se complète plus tard."
            action={
              <button onClick={() => setCreation(false)} className="btn-fantome text-[12px]">
                <ArrowLeft className="h-3.5 w-3.5" /> Rechercher plutôt
              </button>
            }
          >
            <div className="space-y-4 p-4">
              <Bloc titre="Identité">
                <Champ label="Nom" value={f.nom} onChange={maj('nom')} autoFocus required />
                <Champ label="Prénom" value={f.prenom} onChange={maj('prenom')} />
                <Choix
                  label="Sexe"
                  options={['Masculin', 'Féminin']}
                  value={f.sexe}
                  onChange={maj('sexe')}
                />
                <Champ
                  label="Date de naissance"
                  type="date"
                  value={f.age_presume ? '' : f.date_naissance}
                  onChange={(e) =>
                    setF((x) => ({
                      ...x,
                      date_naissance: e.target.value,
                      age_presume: false,
                      age_saisi: '',
                    }))
                  }
                />
                <div>
                  <span className="etiquette mb-1">Âge si date inconnue</span>
                  <div className="flex items-center gap-2">
                    <Champ
                      suffixe="ans"
                      inputMode="numeric"
                      value={f.age_saisi}
                      onChange={majAge}
                      className="w-24"
                    />
                    {f.age_presume ? (
                      <span className="text-[11px] text-encre/50">âge présumé</span>
                    ) : (
                      ageAffiche !== '' && (
                        <span className="tabular font-mono text-[12px] text-encre/60">
                          {ageAffiche} ans
                        </span>
                      )
                    )}
                  </div>
                </div>
                <Champ
                  label="Téléphone"
                  value={f.telephone}
                  onChange={maj('telephone')}
                  placeholder="074 22 52 48"
                />
              </Bloc>

              <Bloc titre="Assurance">
                <Choix
                  label="Organisme"
                  vide={null}
                  options={ORGANISMES}
                  value={f.organisme_choix}
                  onChange={(e) =>
                    setF((x) => ({
                      ...x,
                      organisme_choix: e.target.value,
                      fonds_cnamgs: e.target.value === 'CNAMGS' ? x.fonds_cnamgs : '',
                    }))
                  }
                />
                {f.organisme_choix === 'Autre' && (
                  <Champ
                    label="Nom de l’organisme"
                    value={f.organisme_autre}
                    onChange={maj('organisme_autre')}
                    placeholder="Assurance, mutuelle d’entreprise…"
                  />
                )}
                {f.organisme_choix === 'CNAMGS' && (
                  <Choix
                    label="Fonds"
                    options={FONDS}
                    value={f.fonds_cnamgs}
                    onChange={maj('fonds_cnamgs')}
                  />
                )}
                {f.organisme_choix !== 'Aucune' && (
                  <Champ label="N° d’assuré" value={f.numero_secu} onChange={maj('numero_secu')} />
                )}
              </Bloc>

              <Bloc titre="Adresse">
                <Champ label="Ville" value={f.ville} onChange={maj('ville')} />
                <ChampSuggere
                  label="Quartier"
                  domaine="quartier"
                  valeur={f.quartier}
                  onChange={(v) => setF((x) => ({ ...x, quartier: v }))}
                />
                <Champ label="Adresse (facultatif)" value={f.adresse} onChange={maj('adresse')} />
              </Bloc>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-sarcelle-100 bg-sarcelle-50/40 px-4 py-3">
              <button onClick={passerAuxMotifs} disabled={envoi} className="btn-primaire">
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer et continuer <ArrowRight className="h-[14px] w-[14px]" />
              </button>
            </div>
          </Carte>
        ) : (
          <Carte titre="Qui consulte ?" sous="Un patient déjà au fichier ne demande aucune saisie.">
            <div className="p-4">
              <PatientPicker
                onChoisir={(p) => {
                  setPatient(p)
                  setEtape(2)
                }}
                onCreer={(terme) => {
                  setF({ ...VIDE, nom: terme?.trim() ?? '' })
                  setCreation(true)
                }}
              />
            </div>
          </Carte>
        ))}

      {/* ============================================== étape 2 — les motifs */}
      {etape === 2 && patient && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xs border border-sarcelle-100 bg-white px-4 py-3 shadow-fiche">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sarcelle-100 font-mono text-[11px] font-semibold text-sarcelle-600">
              {initiales(patient)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ardoise">
                {patient.nom} {patient.prenom}
              </p>
              <p className="truncate text-[11.5px] text-encre/55">
                <span className="font-mono">{patient.code}</span>
                {patient.date_naissance &&
                  ` · ${dateFr(patient.date_naissance)} (${age(patient.date_naissance)} ans)`}
                {patient.sexe && ` · ${patient.sexe}`}
                {patient.organisme_assurance && ` · ${patient.organisme_assurance}`}
              </p>
            </div>
            <button
              onClick={() => {
                setEtape(1)
                setPatient(null)
              }}
              className="btn-fantome text-[12px]"
            >
              Changer
            </button>
          </div>

          <Carte
            titre="Pourquoi consulte-t-il ?"
            sous="Plusieurs motifs possibles. Les questions communes ne seront posées qu’une fois."
          >
            <div className="p-4">
              <MotifSelector
                grilles={grilles}
                retenus={motifs}
                onChange={setMotifs}
                sexePatient={patient.sexe}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-sarcelle-100 bg-sarcelle-50/40 px-4 py-3">
              <button onClick={() => setEtape(1)} className="btn-secondaire">
                <ArrowLeft className="h-[14px] w-[14px]" /> Retour
              </button>
              <button
                onClick={ouvrirConsultation}
                disabled={envoi || !motifs.length}
                className="btn-primaire"
              >
                {envoi ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Stethoscope className="h-[14px] w-[14px]" />
                )}
                Ouvrir la consultation
              </button>
            </div>
          </Carte>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ décor */

function Fil({ etape }) {
  const pas = [
    { n: 1, t: 'Patient' },
    { n: 2, t: 'Motifs' },
    { n: 3, t: 'Consultation' },
  ]
  return (
    <ol className="mb-5 flex items-center gap-2 text-[12.5px]">
      {pas.map((p, i) => {
        const fait = etape > p.n
        const actif = etape === p.n
        return (
          <li key={p.n} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-sarcelle-100 sm:w-10" />}
            <span
              className={`grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[11px] ${
                fait
                  ? 'bg-sarcelle text-white'
                  : actif
                    ? 'border border-sarcelle bg-white text-sarcelle-600'
                    : 'border border-sarcelle-100 bg-white text-encre/35'
              }`}
            >
              {fait ? <Check className="h-3 w-3" /> : p.n}
            </span>
            <span className={actif ? 'font-semibold text-ardoise' : 'text-encre/50'}>{p.t}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Bloc({ titre, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[.07em] text-ardoise">
        {titre}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  )
}
