import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, FolderOpen, AlertTriangle, ArrowRight, ArrowLeft, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  chargerGrilles, chargerMotifs, enregistrerMotifs, chargerReponses, fusionner,
  composerParDestination,
} from '../lib/interrogatoire'
import { imc, interpretationImc, age, dateFr, initiales } from '../lib/format'
import { Chargement, Alerte, Puce, Carte } from '../components/ui'
import MotifSelector from '../components/MotifSelector'
import EtapeInterrogatoire from '../components/etapes/EtapeInterrogatoire'
import EtapePrescriptions from '../components/etapes/EtapePrescriptions'
import EtapeCompteRendu from '../components/etapes/EtapeCompteRendu'

const LIBELLE_IMC = 'Indice de masse corporelle'
const ETAPES = [
  { cle: 'motifs', libelle: 'Motifs' },
  { cle: 'interrogatoire', libelle: 'Interrogatoire' },
  { cle: 'prescriptions', libelle: 'Prescriptions' },
  { cle: 'compte_rendu', libelle: 'Compte rendu' },
]

export default function Consultation() {
  const { id } = useParams()
  const { medecin } = useAuth()

  const [chargement, setChargement] = useState(true)
  const [cs, setCs] = useState(null)
  const [patient, setPatient] = useState(null)
  const [params, setParams] = useState([])
  const [grilles, setGrilles] = useState([])
  const [motifs, setMotifs] = useState([])
  const [interrogatoire, setInterrogatoire] = useState({})
  const [avancement, setAvancement] = useState({ faits: 0, total: 0 })
  const [etat, setEtat] = useState({ envoi: false, message: '', erreur: '' })
  const [saisieEnCours, setSaisieEnCours] = useState(false)

  const etape = cs?.etape ?? 'motifs'

  /* ------------------------------------------------------------ chargement */
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        setEtat((e) => ({ ...e, erreur: 'Cette consultation est introuvable.' }))
        setChargement(false)
        return
      }
      setPatient(data.patient)
      const { patient: _p, ...champs } = data
      setCs(champs)

      const { data: existants } = await supabase
        .from('consultation_parametres')
        .select('*')
        .eq('consultation_id', id)
        .order('ordre')

      if (existants?.length) {
        setParams(existants.map((x) => ({ ...x, calcule: x.libelle === LIBELLE_IMC })))
      } else {
        const { data: types } = await supabase
          .from('parametres_types')
          .select('*')
          .eq('actif', true)
          .order('ordre')
        setParams(
          (types ?? []).map((t, i) => ({
            libelle: t.libelle, unite: t.unite, valeur: '', remarque: '',
            ordre: t.ordre ?? i, calcule: t.calcule,
          }))
        )
      }

      const [g, m] = await Promise.all([
        chargerGrilles().catch(() => []),
        chargerMotifs(id).catch(() => []),
      ])
      setGrilles(g)
      setMotifs(m)
      setChargement(false)
    })()
  }, [id])

  /* Recompose le texte de l'interrogatoire quand on arrive au compte rendu. */
  useEffect(() => {
    if (etape !== 'compte_rendu' || !grilles.length || !patient) return
    const { sections } = fusionner(grilles, motifs, patient.sexe)
    chargerReponses(id).then((r) => setInterrogatoire(composerParDestination(sections, r)))
  }, [etape, grilles, motifs, patient, id])

  /* -------------------------------------------------------- enregistrements */
  const enregistrerConsultation = useCallback(
    async (supplement = {}) => {
      if (!cs) return null
      const { id: _i, numero, created_at, updated_at, reste_a_payer, ...champs } = { ...cs, ...supplement }
      const charge = { ...champs }
      const { error } = await supabase.from('consultations').update(charge).eq('id', id)
      if (error) {
        setEtat({ envoi: false, message: '', erreur: `Enregistrement impossible : ${error.message}` })
        return null
      }
      if (Object.keys(supplement).length) setCs((c) => ({ ...c, ...supplement }))
      return true
    },
    [cs, id]
  )

  const enregistrerParametres = useCallback(async () => {
    const imcCalcule = imc(
      params.find((p) => p.libelle === 'Poids')?.valeur,
      params.find((p) => p.libelle === 'Taille')?.valeur
    )
    await supabase.from('consultation_parametres').delete().eq('consultation_id', id)
    const lignes = params
      .map((p, i) => ({
        consultation_id: id,
        libelle: p.libelle,
        unite: p.unite ?? null,
        valeur: p.calcule ? imcCalcule : (p.valeur ?? '').toString().trim(),
        remarque: p.calcule ? interpretationImc(imcCalcule) : (p.remarque ?? '').trim(),
        ordre: p.ordre ?? i,
      }))
      .filter((p) => p.libelle && (p.valeur || p.remarque))
    if (lignes.length) await supabase.from('consultation_parametres').insert(lignes)
  }, [params, id])

  /* Enregistrement différé de la consultation : les textes saisis partent
     en base une seconde après la dernière frappe. Un rafraîchissement ou
     un retour en arrière ne fait donc rien perdre. */
  useEffect(() => {
    if (!cs || chargement) return
    setSaisieEnCours(true)
    const minuteur = setTimeout(async () => {
      await enregistrerConsultation()
      setSaisieEnCours(false)
    }, 1000)
    return () => clearTimeout(minuteur)
  }, [
    cs?.plaintes, cs?.examen_clinique, cs?.examen_paraclinique, cs?.diagnostic,
    cs?.conduite_a_tenir, cs?.note, cs?.antecedents, cs?.histoire_maladie,
  ])

  /* Les constantes suivent le même principe. */
  useEffect(() => {
    if (!params.length || chargement || etape === 'motifs') return
    const minuteur = setTimeout(() => enregistrerParametres(), 1200)
    return () => clearTimeout(minuteur)
  }, [params, chargement, etape])

  const allerA = async (cle, supplement = {}) => {
    setEtat({ envoi: true, message: '', erreur: '' })
    const ok = await enregistrerConsultation({ ...supplement, etape: cle })
    setEtat({ envoi: false, message: '', erreur: ok ? '' : etat.erreur })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ----------------------------------------------------- transitions d'étape */
  const validerMotifs = async () => {
    await enregistrerMotifs(id, grilles, motifs)
    await allerA('interrogatoire')
  }

  const validerInterrogatoire = async (textes) => {
    setInterrogatoire(textes)
    await enregistrerParametres()
    // Les colonnes narratives deviennent le produit de l'interrogatoire
    await allerA('prescriptions', {
      histoire_maladie: textes.histoire_maladie,
      antecedents: textes.antecedents,
    })
  }

  const cloturer = async () => {
    await enregistrerConsultation({ etape: 'terminee', statut: 'Terminée' })
    setEtat({ envoi: false, erreur: '', message: 'Consultation clôturée.' })
  }

  if (chargement) return <Chargement texte="Ouverture de la consultation…" />
  if (!cs)
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alerte>{etat.erreur || 'Consultation introuvable.'}</Alerte>
        <Link to="/consultations/liste" className="btn-secondaire mt-4">
          Retour au registre
        </Link>
      </div>
    )

  const nomsMotifs = grilles.filter((g) => motifs.includes(g.code)).map((g) => g.nom)
  const terminee = etape === 'terminee'

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 lg:px-6">
      {/* ------------------------------------------------------ bandeau patient */}
      <div className="mb-4 rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[12px] font-semibold text-sarcelle-600">
            {initiales(patient)}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              to={`/patients/${patient?.id}`}
              className="truncate text-[16px] font-semibold tracking-tight text-sarcelle-600 hover:underline"
            >
              {patient?.nom} {patient?.prenom}
            </Link>
            <p className="truncate text-[11.5px] text-encre/55">
              <span className="font-mono">{patient?.code}</span>
              {patient?.date_naissance &&
                ` · ${dateFr(patient.date_naissance)} (${age(patient.date_naissance)} ans)`}
              {patient?.sexe && ` · ${patient.sexe}`}
              {patient?.organisme_assurance && ` · ${patient.organisme_assurance}`}
              {' · '}
              <span className="font-mono">{cs.numero}</span>
            </p>
          </div>
          {terminee && <Puce>Terminée</Puce>}
          <Link to={`/patients/${patient?.id}`} className="btn-secondaire">
            <FolderOpen className="h-[14px] w-[14px]" /> Dossier
          </Link>
        </div>

        {patient?.allergies && (
          <div className="flex items-start gap-2 border-t border-panneau-roseb bg-panneau-rose px-4 py-2 text-[12.5px] text-[#8f2b2b]">
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">Allergies :</strong> {patient.allergies}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------- fil d'étapes */}
      {!terminee && (
        <ol className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          {ETAPES.map((e, i) => {
            const rang = ETAPES.findIndex((x) => x.cle === etape)
            const fait = i < rang
            const actif = e.cle === etape
            return (
              <li key={e.cle} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-5 bg-sarcelle-100 sm:w-9" />}
                <button
                  onClick={() => fait && allerA(e.cle)}
                  disabled={!fait}
                  className="flex items-center gap-1.5"
                >
                  <span
                    className={`grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[11px] ${
                      fait
                        ? 'bg-sarcelle text-white'
                        : actif
                          ? 'border border-sarcelle bg-white text-sarcelle-600'
                          : 'border border-sarcelle-100 bg-white text-encre/35'
                    }`}
                  >
                    {fait ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={actif ? 'font-semibold text-ardoise' : 'text-encre/50'}>
                    {e.libelle}
                  </span>
                </button>
                {e.cle === 'interrogatoire' && avancement.total > 0 && (
                  <span className="tabular font-mono text-[10.5px] text-encre/40">
                    {avancement.faits}/{avancement.total}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {saisieEnCours && (
        <p className="sans-impression mb-2 text-[11px] text-encre/40">Enregistrement…</p>
      )}

      {etat.erreur && (
        <div className="mb-3">
          <Alerte>{etat.erreur}</Alerte>
        </div>
      )}
      {etat.message && (
        <div className="mb-3">
          <Alerte ton="succes">{etat.message}</Alerte>
        </div>
      )}

      {/* ============================================================ étapes */}
      {terminee ? (
        <Carte titre="Consultation clôturée" sous={nomsMotifs.join(' · ')}>
          <div className="space-y-3 p-4">
            <p className="text-[13px] text-encre/70">
              Le compte rendu et les prescriptions sont enregistrés dans le dossier du patient.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to={`/patients/${patient?.id}`} className="btn-primaire">
                <FolderOpen className="h-[14px] w-[14px]" /> Ouvrir le dossier
              </Link>
              <button onClick={() => allerA('compte_rendu')} className="btn-secondaire">
                <ArrowLeft className="h-[14px] w-[14px]" /> Revenir au compte rendu
              </button>
              <Link to="/consultations/nouvelle" className="btn-secondaire">
                Patient suivant
              </Link>
            </div>
          </div>
        </Carte>
      ) : etape === 'motifs' ? (
        <Carte
          titre="Pourquoi le patient consulte-t-il ?"
          sous="Plusieurs motifs possibles. Les questions communes ne seront posées qu’une fois."
        >
          <div className="p-4">
            <MotifSelector
              grilles={grilles}
              retenus={motifs}
              onChange={setMotifs}
              sexePatient={patient?.sexe}
            />
          </div>
          <div className="flex justify-end border-t border-sarcelle-100 bg-sarcelle-50/40 px-4 py-3">
            <button
              onClick={validerMotifs}
              disabled={!motifs.length || etat.envoi}
              className="btn-primaire"
            >
              Commencer l’interrogatoire <ArrowRight className="h-[14px] w-[14px]" />
            </button>
          </div>
        </Carte>
      ) : etape === 'interrogatoire' ? (
        <>
          <BandeauMotifs noms={nomsMotifs} onModifier={() => allerA('motifs')} />
          <EtapeInterrogatoire
            consultationId={id}
            patient={patient}
            grilles={grilles}
            motifs={motifs}
            params={params}
            setParams={setParams}
            onValider={validerInterrogatoire}
            onProgression={setAvancement}
          />
        </>
      ) : etape === 'prescriptions' ? (
        <EtapePrescriptions
          consultation={cs}
          setConsultation={setCs}
          patient={patient}
          medecin={medecin}
          grilles={grilles}
          motifs={motifs}
          params={params}
          onRetour={() => allerA('interrogatoire')}
          onValider={() => allerA('compte_rendu')}
        />
      ) : (
        <EtapeCompteRendu
          consultation={cs}
          patient={patient}
          medecin={medecin}
          params={params}
          motifsNoms={nomsMotifs}
          motifsCodes={motifs}
          grilles={grilles}
          interrogatoire={interrogatoire}
          onRetour={() => allerA('prescriptions')}
          onCloturer={cloturer}
        />
      )}
    </div>
  )
}

function BandeauMotifs({ noms, onModifier }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xs border border-sarcelle-100 bg-white px-3 py-2">
      <span className="etiquette">Motifs</span>
      {noms.map((n) => (
        <span key={n} className="puce bg-sarcelle-100 text-sarcelle-600">
          {n}
        </span>
      ))}
      <button onClick={onModifier} className="btn-fantome ml-auto text-[11.5px]">
        Modifier
      </button>
    </div>
  )
}
