import { useEffect, useState } from 'react'
import { UserPlus, ArrowRight, UserSearch } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { age, dateFr, initiales } from '../lib/format'
import { Recherche } from './DataToolbar'
import { Chargement, Vide, Puce } from './ui'

/**
 * Recherche d'un patient existant. Appelle onChoisir(patient) ou
 * onCreer(termeSaisi) si le patient n'est pas encore au fichier.
 */
export default function PatientPicker({ onChoisir, onCreer }) {
  const [terme, setTerme] = useState('')
  const [patients, setPatients] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let annule = false
    const minuteur = setTimeout(async () => {
      setChargement(true)
      let requete = supabase
        .from('patients')
        .select('id, code, nom, prenom, sexe, date_naissance, telephone, mobile, organisme_assurance, ville')
        .order('created_at', { ascending: false })
        .limit(25)

      const t = terme.trim()
      if (t) {
        const motif = `%${t}%`
        requete = requete.or(
          `nom.ilike.${motif},prenom.ilike.${motif},code.ilike.${motif},telephone.ilike.${motif},mobile.ilike.${motif},numero_secu.ilike.${motif}`
        )
      }
      const { data } = await requete
      if (!annule) {
        setPatients(data ?? [])
        setChargement(false)
      }
    }, 220)
    return () => {
      annule = true
      clearTimeout(minuteur)
    }
  }, [terme])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Recherche
          valeur={terme}
          onChange={setTerme}
          placeholder="Nom, prénom, n° de dossier, téléphone ou n° d'assuré"
          className="min-w-[240px] flex-1"
        />
        <button onClick={() => onCreer?.(terme)} className="btn-secondaire">
          <UserPlus className="h-[14px] w-[14px]" /> Nouveau patient
        </button>
      </div>

      <div className="max-h-[46vh] overflow-y-auto fin rounded-xs border border-sarcelle-100">
        {chargement ? (
          <Chargement texte="Recherche…" />
        ) : patients.length === 0 ? (
          <Vide
            icone={UserSearch}
            titre="Aucun patient trouvé"
            texte={
              terme
                ? `Rien ne correspond à « ${terme} » dans le fichier patients. Créez la fiche pour continuer.`
                : 'Le fichier patients est vide. Commencez par créer une fiche.'
            }
            action={
              <button onClick={() => onCreer?.(terme)} className="btn-primaire">
                <UserPlus className="h-[14px] w-[14px]" /> Créer la fiche patient
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-sarcelle-100">
            {patients.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onChoisir?.(p)}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-sarcelle-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[11px] font-semibold text-sarcelle-600">
                    {initiales(p)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate text-[13.5px] font-semibold text-ardoise">
                        {p.nom} {p.prenom}
                      </span>
                      <span className="font-mono text-[11px] text-encre/45">{p.code}</span>
                    </span>
                    <span className="mt-[1px] block truncate text-[11.5px] text-encre/55">
                      {[
                        p.sexe,
                        p.date_naissance ? `${age(p.date_naissance)} ans — ${dateFr(p.date_naissance)}` : null,
                        p.telephone || p.mobile,
                        p.ville,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {p.organisme_assurance && <Puce ton="Validé">{p.organisme_assurance}</Puce>}
                  <ArrowRight className="h-4 w-4 shrink-0 text-encre/20 transition group-hover:translate-x-0.5 group-hover:text-sarcelle" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
