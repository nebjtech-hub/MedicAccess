import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2, ListOrdered, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateHeureFr } from '../lib/format'
import { Puce } from '../components/ui'

export default function ConsultationsHub() {
  const [enCours, setEnCours] = useState([])

  useEffect(() => {
    supabase
      .from('consultations')
      .select('id, numero, date_consultation, motif, statut, patient:patients(nom, prenom, code)')
      .eq('statut', 'En cours')
      .order('date_consultation', { ascending: false })
      .limit(5)
      .then(({ data }) => setEnCours(data ?? []))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-9 lg:px-6">
      <h1 className="text-[24px] font-semibold tracking-tight text-ardoise">Consultations</h1>
      <p className="mt-1 text-[13px] text-encre/55">
        Ouvrez une nouvelle fiche de consultation ou reprenez le registre.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Action
          to="/consultations/nouvelle"
          icone={FilePlus2}
          titre="Créer une consultation"
          texte="Rechercher le patient dans le fichier, ou créer sa fiche s’il vient pour la première fois."
          teinte="bg-panneau-cyanb"
        />
        <Action
          to="/consultations/liste"
          icone={ListOrdered}
          titre="Liste des consultations"
          texte="Registre complet, filtres par période, patient, statut, et export Excel."
          teinte="bg-panneau-vertb"
        />
      </div>

      {enCours.length > 0 && (
        <section className="mt-7 rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
          <header className="border-b border-sarcelle-100 px-4 py-2.5">
            <h2 className="text-[13.5px] font-semibold text-ardoise">Consultations en cours</h2>
            <p className="text-[11.5px] text-encre/55">Fiches ouvertes qui n’ont pas encore été clôturées.</p>
          </header>
          <ul className="divide-y divide-sarcelle-100">
            {enCours.map((x) => (
              <li key={x.id}>
                <Link
                  to={`/consultations/${x.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-sarcelle-50/70"
                >
                  <span className="font-mono text-[11px] text-encre/40">{x.numero}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ardoise">
                    {x.patient?.nom} {x.patient?.prenom}
                  </span>
                  <span className="hidden text-[11.5px] text-encre/45 sm:block">
                    {dateHeureFr(x.date_consultation)}
                  </span>
                  <Puce>{x.statut}</Puce>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Action({ to, icone: Icone, titre, texte, teinte }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xs border border-sarcelle-100 bg-white p-5 shadow-fiche transition hover:border-sarcelle-400"
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] ${teinte}`} />
      <Icone className="h-6 w-6 text-sarcelle" strokeWidth={1.6} />
      <h2 className="mt-3 flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-ardoise">
        {titre}
        <ArrowRight className="h-4 w-4 text-encre/25 transition group-hover:translate-x-1 group-hover:text-sarcelle" />
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-encre/60">{texte}</p>
    </Link>
  )
}
