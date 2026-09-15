import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Save, Stethoscope, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { age } from '../lib/format'
import { Champ, Choix, Zone, Case, Carte, Alerte, Chargement } from '../components/ui'

const SEXES = ['Masculin', 'Féminin']
const ETATS_CIVILS = ['Célibataire', 'Marié(e)', 'Concubinage', 'Veuf(ve)', 'Divorcé(e)']
const MOYENS = ['Téléphone', 'SMS', 'WhatsApp', 'Email']
const GROUPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ORGANISMES = ['CNAMGS', 'CNSS', 'Assurance privée', 'Mutuelle d’entreprise', 'Aucun']
const REGIMES = ['GEF (Gabonais économiquement faible)', 'Agents publics', 'Secteur privé', 'Étudiant', 'Retraité', 'Autre']
const LIENS = ['Titulaire', 'Conjoint(e)', 'Enfant', 'Ascendant', 'Autre ayant droit']
const PROVINCES = [
  'Estuaire',
  'Haut-Ogooué',
  'Moyen-Ogooué',
  'Ngounié',
  'Nyanga',
  'Ogooué-Ivindo',
  'Ogooué-Lolo',
  'Ogooué-Maritime',
  'Woleu-Ntem',
]

const VIDE = {
  nom: '',
  prenom: '',
  sexe: '',
  date_naissance: '',
  age_presume: false,
  lieu_naissance: '',
  etat_civil: '',
  date_mariage: '',
  admis_le: '',
  categorie: '',
  profession: '',
  service: '',
  nom_mere: '',
  nom_pere: '',
  adresse: '',
  adresse2: '',
  quartier: '',
  pays: 'Gabon',
  departement: '',
  ville: 'Libreville',
  telephone: '',
  mobile: '',
  email: '',
  moyen_contact: '',
  personne_urgence: '',
  tel_urgence: '',
  numero_secu: '',
  organisme_assurance: '',
  regime_assurance: '',
  numero_carte_assure: '',
  taux_couverture: '',
  convention: '',
  numero_police: '',
  validite_assurance: '',
  assure_principal: '',
  lien_assure: '',
  tiers_payant: false,
  groupe_sanguin: '',
  allergies: '',
  note: '',
}

export default function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recherche] = useSearchParams()
  const { medecin } = useAuth()

  const modification = Boolean(id)
  const suite = recherche.get('suite') // 'consultation' → ouvre la consultation après création
  const [f, setF] = useState(() => ({ ...VIDE, nom: recherche.get('nom') ?? '' }))
  const [code, setCode] = useState('')
  const [chargement, setChargement] = useState(modification)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!modification) return
    supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const { id: _i, code: c, created_at, updated_at, medecin_traitant, photo_url, ...reste } = data
          setCode(c)
          setF({ ...VIDE, ...Object.fromEntries(Object.entries(reste).map(([k, v]) => [k, v ?? VIDE[k] ?? ''])) })
        } else setErreur('Patient introuvable.')
        setChargement(false)
      })
  }, [id, modification])

  const maj = (k) => (e) =>
    setF((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const ageCalcule = useMemo(() => age(f.date_naissance), [f.date_naissance])

  const enregistrer = async (e) => {
    e.preventDefault()
    if (!f.nom.trim()) {
      setErreur('Le nom du patient est obligatoire.')
      return
    }
    setEnvoi(true)
    setErreur('')

    // Les champs date et numériques vides doivent partir en NULL, pas en ''
    const charge = Object.fromEntries(
      Object.entries(f).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v])
    )
    charge.taux_couverture = f.taux_couverture === '' ? null : Number(f.taux_couverture)
    charge.medecin_traitant = f.medecin_traitant || medecin?.id || null

    const requete = modification
      ? supabase.from('patients').update(charge).eq('id', id).select('id').single()
      : supabase.from('patients').insert(charge).select('id').single()

    const { data, error } = await requete
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      setEnvoi(false)
      return
    }

    if (suite === 'consultation') {
      const { data: cs, error: err2 } = await supabase
        .from('consultations')
        .insert({ patient_id: data.id, medecin_id: medecin?.id ?? null })
        .select('id')
        .single()
      setEnvoi(false)
      if (err2) {
        setErreur(`Patient enregistré, mais la consultation n'a pas pu être ouverte : ${err2.message}`)
        return
      }
      navigate(`/consultations/${cs.id}`, { replace: true })
      return
    }

    setEnvoi(false)
    navigate(`/patients/${data.id}`, { replace: true })
  }

  if (chargement) return <Chargement texte="Chargement de la fiche…" />

  return (
    <form onSubmit={enregistrer} className="mx-auto max-w-5xl px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/patients" className="btn-fantome -ml-2 mb-1 text-[12px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Fichier patients
          </Link>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">
            {modification ? 'Modifier la fiche patient' : 'Nouveau patient'}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-encre/55">
            {modification ? (
              <>
                Dossier <span className="font-mono">{code}</span>
              </>
            ) : suite === 'consultation' ? (
              'La consultation s’ouvrira automatiquement après l’enregistrement.'
            ) : (
              'Le numéro de dossier est attribué automatiquement.'
            )}
          </p>
        </div>
        <button type="submit" disabled={envoi} className="btn-primaire">
          {suite === 'consultation' ? (
            <Stethoscope className="h-[14px] w-[14px]" />
          ) : (
            <Save className="h-[14px] w-[14px]" />
          )}
          {envoi
            ? 'Enregistrement…'
            : suite === 'consultation'
              ? 'Enregistrer et consulter'
              : 'Enregistrer la fiche'}
        </button>
      </div>

      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}

      <div className="space-y-3">
        {/* ------------------------------------------ informations générales */}
        <Carte titre="Informations générales">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Champ label="Nom" value={f.nom} onChange={maj('nom')} required autoFocus />
            <Champ label="Prénom" value={f.prenom} onChange={maj('prenom')} />
            <Choix label="Sexe" options={SEXES} value={f.sexe} onChange={maj('sexe')} />
            <Champ label="Date de naissance" type="date" value={f.date_naissance ?? ''} onChange={maj('date_naissance')} />
            <div>
              <span className="etiquette mb-1">Âge</span>
              <div className="flex items-center gap-3">
                <span className="tabular champ w-20 bg-black/[.03] text-center font-mono">{ageCalcule || '—'}</span>
                <Case label="Présumé" checked={!!f.age_presume} onChange={maj('age_presume')} />
              </div>
            </div>
            <Champ label="Lieu de naissance" value={f.lieu_naissance} onChange={maj('lieu_naissance')} />
            <Choix label="État civil" options={ETATS_CIVILS} value={f.etat_civil} onChange={maj('etat_civil')} />
            <Champ label="Date de mariage" type="date" value={f.date_mariage ?? ''} onChange={maj('date_mariage')} />
            <Champ label="Admis le" type="date" value={f.admis_le ?? ''} onChange={maj('admis_le')} />
            <Champ label="Catégorie" value={f.categorie} onChange={maj('categorie')} placeholder="Adulte, Pédiatrie…" />
            <Champ label="Profession" value={f.profession} onChange={maj('profession')} />
            <Champ label="Service" value={f.service} onChange={maj('service')} />
            <Champ label="Nom de la mère" value={f.nom_mere} onChange={maj('nom_mere')} />
            <Champ label="Nom du père" value={f.nom_pere} onChange={maj('nom_pere')} />
            <Choix label="Groupe sanguin" options={GROUPES} value={f.groupe_sanguin} onChange={maj('groupe_sanguin')} />
          </div>
        </Carte>

        {/* ------------------------------------------ sécurité sociale */}
        <Carte
          titre="Sécurité sociale et assurance"
          sous="Ces informations alimentent la facturation et les comptes rendus."
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Choix
              label="Organisme"
              options={ORGANISMES}
              value={f.organisme_assurance}
              onChange={maj('organisme_assurance')}
            />
            <Champ
              label="N° de sécurité sociale"
              value={f.numero_secu}
              onChange={maj('numero_secu')}
              placeholder="Numéro d’assuré CNAMGS / CNSS"
            />
            <Choix label="Régime" options={REGIMES} value={f.regime_assurance} onChange={maj('regime_assurance')} />
            <Champ label="N° de carte d’assuré" value={f.numero_carte_assure} onChange={maj('numero_carte_assure')} />
            <Champ label="N° de police" value={f.numero_police} onChange={maj('numero_police')} />
            <Champ
              label="Taux de couverture"
              type="number"
              min="0"
              max="100"
              step="1"
              suffixe="%"
              value={f.taux_couverture ?? ''}
              onChange={maj('taux_couverture')}
            />
            <Champ label="Convention" value={f.convention} onChange={maj('convention')} placeholder="BGFI, Total…" />
            <Champ
              label="Validité de la couverture"
              type="date"
              value={f.validite_assurance ?? ''}
              onChange={maj('validite_assurance')}
            />
            <Champ label="Assuré principal" value={f.assure_principal} onChange={maj('assure_principal')} />
            <Choix label="Lien avec l’assuré" options={LIENS} value={f.lien_assure} onChange={maj('lien_assure')} />
            <div className="flex items-end pb-1">
              <Case label="Tiers payant appliqué" checked={!!f.tiers_payant} onChange={maj('tiers_payant')} />
            </div>
          </div>
        </Carte>

        {/* ------------------------------------------ adresse */}
        <Carte titre="Adresse">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Champ label="Adresse" className="sm:col-span-2 lg:col-span-3" value={f.adresse} onChange={maj('adresse')} />
            <Champ label="Complément d’adresse" className="sm:col-span-2" value={f.adresse2} onChange={maj('adresse2')} />
            <Champ label="Quartier" value={f.quartier} onChange={maj('quartier')} />
            <Champ label="Pays" value={f.pays} onChange={maj('pays')} />
            <Choix label="Province / Département" options={PROVINCES} value={f.departement} onChange={maj('departement')} />
            <Champ label="Ville" value={f.ville} onChange={maj('ville')} />
          </div>
        </Carte>

        {/* ------------------------------------------ contact */}
        <Carte titre="Contact">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Champ label="Téléphone" value={f.telephone} onChange={maj('telephone')} placeholder="074 22 52 48" />
            <Champ label="Mobile" value={f.mobile} onChange={maj('mobile')} />
            <Champ label="Email" type="email" value={f.email} onChange={maj('email')} />
            <Choix label="Moyen de contact préféré" options={MOYENS} value={f.moyen_contact} onChange={maj('moyen_contact')} />
            <Champ label="Personne à prévenir" value={f.personne_urgence} onChange={maj('personne_urgence')} />
            <Champ label="Téléphone d’urgence" value={f.tel_urgence} onChange={maj('tel_urgence')} />
          </div>
        </Carte>

        {/* ------------------------------------------ dossier */}
        <Carte titre="Dossier médical">
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            <Zone
              label="Allergies"
              rows={3}
              value={f.allergies}
              onChange={maj('allergies')}
              placeholder="Signalées en rouge sur chaque consultation"
            />
            <Zone label="Note" rows={3} value={f.note} onChange={maj('note')} />
          </div>
        </Carte>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Link to={modification ? `/patients/${id}` : '/patients'} className="btn-secondaire">
          Annuler
        </Link>
        <button type="submit" disabled={envoi} className="btn-primaire">
          <Save className="h-[14px] w-[14px]" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
