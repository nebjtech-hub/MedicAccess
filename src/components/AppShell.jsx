import { useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  Stethoscope,
  Users,
  FileText,
  FlaskConical,
  LayoutTemplate,
  Pill,
  LogOut,
  Menu,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Chargement } from './ui'

const NAVIGATION = [
  { to: '/tableau-de-bord', libelle: 'Tableau de bord', icone: LayoutGrid },
  { to: '/consultations', libelle: 'Consultations', icone: Stethoscope },
  { to: '/patients', libelle: 'Patients', icone: Users },
  { to: '/examens', libelle: 'Examens', icone: FlaskConical },
  { to: '/comptes-rendus', libelle: 'Comptes rendus', icone: FileText },
  { to: '/modeles', libelle: 'Modèles de CR', icone: LayoutTemplate },
  { to: '/protocoles', libelle: 'Protocoles', icone: Pill },
]

export function RouteProtegee() {
  const { session, chargement } = useAuth()
  const location = useLocation()
  if (chargement) return <div className="min-h-screen bg-brume"><Chargement texte="Ouverture de la session…" /></div>
  if (!session) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  return <AppShell />
}

function AppShell() {
  const { medecin, deconnexion } = useAuth()
  const [menuOuvert, setMenuOuvert] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* -------------------------------------------------- barre latérale */}
      <aside
        className={`sans-impression fixed inset-y-0 left-0 z-40 flex w-[216px] flex-col bg-encre text-white transition-transform
                    lg:translate-x-0 ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-4 pb-5 pt-5">
          <div className="flex items-baseline gap-[3px] font-mono text-[15px] font-semibold tracking-tight">
            <span className="text-white">Medic</span>
            <span className="text-sarcelle-400">Access</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full bg-[#009E60]" />
            <span className="h-[3px] w-4 rounded-full bg-or" />
            <span className="h-[3px] w-4 rounded-full bg-[#3A75C4]" />
            <span className="text-[10px] uppercase tracking-[.18em] text-white/45">Gabon</span>
          </div>
        </div>

        <nav className="flex-1 space-y-[2px] px-2">
          {NAVIGATION.map(({ to, libelle, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOuvert(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-[13px] transition ${
                  isActive
                    ? 'bg-white/[.09] font-medium text-white shadow-[inset_2px_0_0_#3FB2B6]'
                    : 'text-white/65 hover:bg-white/[.05] hover:text-white'
                }`
              }
            >
              <Icone className="h-[15px] w-[15px]" strokeWidth={1.8} />
              {libelle}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3">
          <div className="mb-2 leading-tight">
            <p className="truncate text-[12.5px] font-medium">
              {medecin?.civilite ?? 'Dr'} {medecin?.nom} {medecin?.prenom}
            </p>
            <p className="truncate text-[11px] text-white/45">
              {medecin?.specialite || medecin?.email || 'Médecin'}
            </p>
          </div>
          <button
            onClick={deconnexion}
            className="flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-[12px] text-white/60 transition hover:bg-white/[.06] hover:text-white"
          >
            <LogOut className="h-[14px] w-[14px]" /> Se déconnecter
          </button>
        </div>
      </aside>

      {menuOuvert && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMenuOuvert(false)}
          className="fixed inset-0 z-30 bg-encre/40 lg:hidden"
        />
      )}

      {/* ------------------------------------------------------- contenu */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[216px]">
        <header className="sans-impression sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-sarcelle-100 bg-white/85 px-3 backdrop-blur lg:px-5">
          <button onClick={() => setMenuOuvert(true)} className="btn-fantome px-1.5 lg:hidden" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </button>
          <FilAriane />
          <div className="ml-auto hidden items-center gap-1.5 text-[11px] text-encre/45 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2c9c4a]" />
            {medecin?.etablissement ?? 'Centre Diagnostic'}
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const LIBELLES = {
  'tableau-de-bord': 'Tableau de bord',
  consultations: 'Consultations',
  nouvelle: 'Nouvelle consultation',
  patients: 'Patients',
  nouveau: 'Nouveau patient',
  examens: 'Examens',
  'comptes-rendus': 'Comptes rendus',
  modeles: 'Modèles de compte rendu',
  protocoles: 'Protocoles de prescription',
  dossier: 'Dossier médical',
}

function FilAriane() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  return (
    <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1 text-[12.5px]">
      {segments.map((s, i) => {
        const dernier = i === segments.length - 1
        const libelle = LIBELLES[s] ?? (s.length > 14 ? 'Détail' : s)
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-encre/25" />}
            <span className={dernier ? 'truncate font-medium text-ardoise' : 'truncate text-encre/50'}>
              {libelle}
            </span>
          </span>
        )
      })}
    </nav>
  )
}
