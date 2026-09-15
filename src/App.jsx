import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { RouteProtegee } from './components/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ConsultationsHub from './pages/ConsultationsHub'
import ConsultationsList from './pages/ConsultationsList'
import NouvelleConsultation from './pages/NouvelleConsultation'
import Consultation from './pages/Consultation'
import PatientsList from './pages/PatientsList'
import PatientForm from './pages/PatientForm'
import PatientDossier from './pages/PatientDossier'
import ExamensList from './pages/ExamensList'
import ExamensPatient from './pages/ExamensPatient'
import ComptesRendusList from './pages/ComptesRendusList'
import CompteRenduEditor from './pages/CompteRenduEditor'
import ModelesList from './pages/ModelesList'
import ProtocolesList from './pages/ProtocolesList'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />

      <Route element={<RouteProtegee />}>
        <Route path="/tableau-de-bord" element={<Dashboard />} />

        <Route path="/consultations" element={<ConsultationsHub />} />
        <Route path="/consultations/liste" element={<ConsultationsList />} />
        <Route path="/consultations/nouvelle" element={<NouvelleConsultation />} />
        <Route path="/consultations/:id" element={<Consultation />} />

        <Route path="/patients" element={<PatientsList />} />
        <Route path="/patients/nouveau" element={<PatientForm />} />
        <Route path="/patients/:id" element={<PatientDossier />} />
        <Route path="/patients/:id/modifier" element={<PatientForm />} />

        <Route path="/examens" element={<ExamensList />} />
        <Route path="/examens/:patientId" element={<ExamensPatient />} />

        <Route path="/comptes-rendus" element={<ComptesRendusList />} />
        <Route path="/comptes-rendus/nouveau" element={<CompteRenduEditor />} />
        <Route path="/comptes-rendus/:id" element={<CompteRenduEditor />} />

        <Route path="/modeles" element={<ModelesList />} />
        <Route path="/protocoles" element={<ProtocolesList />} />
      </Route>

      <Route path="/" element={<Navigate to="/tableau-de-bord" replace />} />
      <Route path="*" element={<PageIntrouvable />} />
    </Routes>
  )
}

function PageIntrouvable() {
  return (
    <div className="grid min-h-screen place-items-center bg-brume px-4 text-center">
      <div>
        <p className="font-mono text-[12px] uppercase tracking-[.16em] text-encre/40">Erreur 404</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-ardoise">Cette page n'existe pas</h1>
        <p className="mt-1 text-[13px] text-encre/55">Le lien est peut-être obsolète.</p>
        <Link to="/tableau-de-bord" className="btn-primaire mt-5">
          Revenir au tableau de bord
        </Link>
      </div>
    </div>
  )
}
