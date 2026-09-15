import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Champ, Alerte } from '../components/ui'

export default function Login() {
  const { session, connexion, inscription, chargement } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('connexion')
  const [f, setF] = useState({ email: '', motDePasse: '', nom: '', prenom: '', specialite: '' })
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (!chargement && session) return <Navigate to={location.state?.from ?? '/tableau-de-bord'} replace />

  const maj = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')
    setInfo('')
    setEnvoi(true)
    if (mode === 'connexion') {
      const err = await connexion(f.email.trim(), f.motDePasse)
      if (err) setErreur(traduire(err))
    } else {
      const err = await inscription({
        email: f.email.trim(),
        motDePasse: f.motDePasse,
        nom: f.nom.trim(),
        prenom: f.prenom.trim(),
        specialite: f.specialite.trim(),
      })
      if (err) setErreur(traduire(err))
      else setInfo('Compte créé. Vous pouvez vous connecter — vérifiez votre boîte mail si la confirmation est exigée.')
    }
    setEnvoi(false)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,44%)_1fr]">
      {/* ------------------------------------------------ volet identité */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-encre p-10 text-white lg:flex">
        <div>
          <div className="flex items-baseline gap-[3px] font-mono text-[19px] font-semibold tracking-tight">
            <span>Medic</span>
            <span className="text-sarcelle-400">Access</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-[3px] w-6 rounded-full bg-[#009E60]" />
            <span className="h-[3px] w-6 rounded-full bg-or" />
            <span className="h-[3px] w-6 rounded-full bg-[#3A75C4]" />
            <span className="text-[10.5px] uppercase tracking-[.2em] text-white/45">Gabon</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-[30px] font-semibold leading-[1.15] tracking-tight">
            Le dossier du patient,
            <br />
            <span className="text-sarcelle-400">de la salle d'attente au compte rendu.</span>
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/60">
            Consultations, constantes, ordonnances et comptes rendus réunis dans un seul dossier médical
            électronique. Conçu pour les cabinets et centres de diagnostic gabonais.
          </p>
        </div>

        {/* Signature graphique : relevé de constantes en typographie machine */}
        <div className="relative z-10 font-mono text-[11px] leading-relaxed text-white/25">
          <div>PA 120/80 mmHg · T° 36,8 °C · SpO₂ 98 % · FC 72 bpm</div>
          <div className="mt-1 text-white/15">DOSSIER 110081-26 · CS-2026-00147 · CR-2026-00092</div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-sarcelle/20 blur-3xl"
        />
      </div>

      {/* --------------------------------------------------- volet formulaire */}
      <div className="flex items-center justify-center bg-brume px-5 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-7 lg:hidden">
            <div className="flex items-baseline gap-[3px] font-mono text-[17px] font-semibold text-encre">
              <span>Medic</span>
              <span className="text-sarcelle">Access</span>
              <span className="ml-1 text-[10px] uppercase tracking-[.2em] text-encre/40">Gabon</span>
            </div>
          </div>

          <h2 className="text-[19px] font-semibold tracking-tight text-ardoise">
            {mode === 'connexion' ? 'Accès praticien' : 'Créer un accès praticien'}
          </h2>
          <p className="mt-1 text-[12.5px] text-encre/55">
            {mode === 'connexion'
              ? 'Identifiez-vous pour ouvrir vos consultations du jour.'
              : 'Renseignez votre identité telle qu’elle apparaîtra sur les comptes rendus.'}
          </p>

          <form onSubmit={soumettre} className="mt-6 space-y-3">
            {mode === 'inscription' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Champ label="Nom" value={f.nom} onChange={maj('nom')} required autoComplete="family-name" />
                  <Champ label="Prénom" value={f.prenom} onChange={maj('prenom')} autoComplete="given-name" />
                </div>
                <Champ
                  label="Spécialité"
                  value={f.specialite}
                  onChange={maj('specialite')}
                  placeholder="Médecine générale, Cardiologie…"
                />
              </>
            )}

            <Champ
              label="Adresse e-mail"
              type="email"
              value={f.email}
              onChange={maj('email')}
              required
              autoComplete="email"
              placeholder="prenom.nom@centrediagnostic.ga"
            />
            <Champ
              label="Mot de passe"
              type="password"
              value={f.motDePasse}
              onChange={maj('motDePasse')}
              required
              minLength={6}
              autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />

            <Alerte>{erreur}</Alerte>
            {info && <Alerte ton="succes">{info}</Alerte>}

            <button type="submit" disabled={envoi} className="btn-primaire w-full py-2.5">
              {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'connexion' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-encre/55">
            {mode === 'connexion' ? "Pas encore d'accès ?" : 'Vous avez déjà un accès ?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'connexion' ? 'inscription' : 'connexion')
                setErreur('')
                setInfo('')
              }}
              className="font-medium text-sarcelle underline decoration-sarcelle/30 underline-offset-2 hover:decoration-sarcelle"
            >
              {mode === 'connexion' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function traduire(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'Adresse e-mail ou mot de passe incorrect.'
  if (m.includes('already registered')) return 'Cette adresse e-mail possède déjà un compte.'
  if (m.includes('email not confirmed')) return "L'adresse e-mail n'a pas encore été confirmée."
  if (m.includes('password')) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (m.includes('failed to fetch')) return 'Connexion à Supabase impossible. Vérifiez le fichier .env et votre réseau.'
  return message
}
