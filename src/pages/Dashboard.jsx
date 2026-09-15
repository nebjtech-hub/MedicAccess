import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope, Users, FileText, FlaskConical, LayoutTemplate, Plus, List, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { dateHeureFr, jourLong } from '../lib/format'
import { Puce } from '../components/ui'

export default function Dashboard() {
  const { medecin } = useAuth()
  const [c, setC] = useState({ jour: 0, patients: 0, cr: 0, brouillons: 0, examens: 0 })
  const [dernieres, setDernieres] = useState([])

  useEffect(() => {
    const debutJour = new Date()
    debutJour.setHours(0, 0, 0, 0)

    ;(async () => {
      const [jour, patients, cr, brouillons, examens, recentes] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .gte('date_consultation', debutJour.toISOString()),
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('comptes_rendus').select('id', { count: 'exact', head: true }),
        supabase.from('comptes_rendus').select('id', { count: 'exact', head: true }).eq('statut', 'Brouillon'),
        supabase
          .from('examens_demandes')
          .select('id', { count: 'exact', head: true })
          .in('statut', ['Demandé', 'En cours']),
        supabase
          .from('consultations')
          .select('id, numero, date_consultation, motif, statut, patient:patients(nom, prenom, code)')
          .order('date_consultation', { ascending: false })
          .limit(6),
      ])

      setC({
        jour: jour.count ?? 0,
        patients: patients.count ?? 0,
        cr: cr.count ?? 0,
        brouillons: brouillons.count ?? 0,
        examens: examens.count ?? 0,
      })
      setDernieres(recentes.data ?? [])
    })()
  }, [])

  const heure = new Date().getHours()
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 lg:px-6">
      <header className="mb-7">
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-encre/40">{jourLong()}</p>
        <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight text-ardoise">
          {salutation}, {medecin?.civilite ?? 'Dr'} {medecin?.nom}
        </h1>
        <p className="mt-1 text-[13px] text-encre/55">
          {c.jour === 0
            ? "Aucune consultation enregistrée aujourd'hui."
            : `${c.jour} consultation${c.jour > 1 ? 's' : ''} aujourd'hui.`}
        </p>
      </header>

      {/* ------------------------------------------------------------- cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CardModule
          teinte="cyan"
          icone={Stethoscope}
          titre="Consultation"
          texte="Ouvrir une nouvelle consultation ou reprendre le registre des consultations passées."
          compteur={c.jour}
          libelleCompteur="aujourd'hui"
          actions={[
            { to: '/consultations/nouvelle', libelle: 'Créer une consultation', icone: Plus, primaire: true },
            { to: '/consultations/liste', libelle: 'Voir la liste', icone: List },
          ]}
        />
        <CardModule
          teinte="vert"
          icone={Users}
          titre="Patients"
          texte="Fichier patients et dossier médical électronique : consultations, comptes rendus, ordonnances."
          compteur={c.patients}
          libelleCompteur="au fichier"
          actions={[
            { to: '/patients', libelle: 'Consulter le fichier', icone: List, primaire: true },
            { to: '/patients/nouveau', libelle: 'Nouveau patient', icone: Plus },
          ]}
        />
        <CardModule
          teinte="cyan"
          icone={FlaskConical}
          titre="Examens"
          texte="Examens prescrits par patient. Saisie des résultats et suivi de leur évolution."
          compteur={c.examens}
          libelleCompteur="résultats à saisir"
          actions={[
            { to: '/examens', libelle: 'Ouvrir les examens', icone: List, primaire: true },
          ]}
        />
        <CardModule
          teinte="ambre"
          icone={FileText}
          titre="Comptes rendus"
          texte="Comptes rendus rédigés, validés et signés, filtrables et exportables."
          compteur={c.cr}
          libelleCompteur={c.brouillons ? `dont ${c.brouillons} brouillon${c.brouillons > 1 ? 's' : ''}` : 'au total'}
          actions={[
            { to: '/comptes-rendus', libelle: 'Voir les comptes rendus', icone: List, primaire: true },
            { to: '/modeles', libelle: 'Configurer les modèles', icone: LayoutTemplate },
          ]}
        />
      </div>

      {/* ------------------------------------------------ dernières consultations */}
      <section className="mt-7 rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
        <header className="flex items-center justify-between border-b border-sarcelle-100 px-4 py-2.5">
          <h2 className="text-[13.5px] font-semibold text-ardoise">Dernières consultations</h2>
          <Link to="/consultations/liste" className="btn-fantome text-[12px]">
            Tout le registre <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </header>
        {dernieres.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-encre/50">
            Aucune consultation enregistrée pour le moment.{' '}
            <Link to="/consultations/nouvelle" className="font-medium text-sarcelle underline underline-offset-2">
              Créer la première
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-sarcelle-100">
            {dernieres.map((x) => (
              <li key={x.id}>
                <Link
                  to={`/consultations/${x.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sarcelle-50/70"
                >
                  <span className="font-mono text-[11px] text-encre/40">{x.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ardoise">
                      {x.patient?.nom} {x.patient?.prenom}
                    </span>
                    <span className="block truncate text-[11.5px] text-encre/50">
                      {x.motif || 'Motif non renseigné'}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-[11.5px] text-encre/45 sm:block">
                    {dateHeureFr(x.date_consultation)}
                  </span>
                  <Puce>{x.statut}</Puce>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const TEINTES = {
  cyan: 'bg-panneau-cyanb',
  vert: 'bg-panneau-vertb',
  ambre: 'bg-panneau-ambreb',
}

function CardModule({ teinte, icone: Icone, titre, texte, compteur, libelleCompteur, actions }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
      <span className={`absolute inset-x-0 top-0 h-[3px] ${TEINTES[teinte]}`} />
      <div className="flex-1 p-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xs bg-sarcelle-50 text-sarcelle">
            <Icone className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <span className="text-right">
            <span className="tabular block font-mono text-[22px] font-semibold leading-none text-ardoise">
              {compteur}
            </span>
            <span className="mt-1 block text-[10.5px] uppercase tracking-[.06em] text-encre/45">
              {libelleCompteur}
            </span>
          </span>
        </div>
        <h2 className="mt-3.5 text-[15px] font-semibold tracking-tight text-ardoise">{titre}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-encre/60">{texte}</p>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-sarcelle-100 bg-sarcelle-50/40 p-3">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className={a.primaire ? 'btn-primaire' : 'btn-secondaire'}>
            <a.icone className="h-[14px] w-[14px]" />
            {a.libelle}
          </Link>
        ))}
      </div>
    </article>
  )
}
