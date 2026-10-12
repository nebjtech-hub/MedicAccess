import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History, Copy, Check, ChevronDown, FolderOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateFr } from '../lib/format'

/**
 * Consultation précédente du patient, repliée au-dessus du parcours.
 *
 * L'essentiel des consultations sont des contrôles : le médecin a
 * besoin de relire ce qu'elle a conclu la dernière fois, et de
 * recopier ce qui n'a pas changé, sans quitter la consultation en
 * cours ni rouvrir le dossier.
 */
export default function ConsultationPrecedente({ patientId, consultationId, onCopier }) {
  const [precedente, setPrecedente] = useState(null)
  const [ouverte, setOuverte] = useState(false)
  const [copie, setCopie] = useState('')

  useEffect(() => {
    if (!patientId) return
    ;(async () => {
      const { data } = await supabase
        .from('consultations')
        .select(
          'id, numero, date_consultation, diagnostic, conduite_a_tenir, examen_clinique, ' +
            'plaintes, histoire_maladie, motifs:consultation_motifs(grille:grilles(nom))'
        )
        .eq('patient_id', patientId)
        .neq('id', consultationId)
        .order('date_consultation', { ascending: false })
        .limit(1)

      const c = data?.[0]
      if (!c) return

      const [{ data: ordo }, { data: resultats }] = await Promise.all([
        supabase
          .from('ordonnances')
          .select('lignes:ordonnance_lignes(medicament, posologie, duree, ordre)')
          .eq('consultation_id', c.id)
          .maybeSingle(),
        supabase
          .from('examens_demandes')
          .select('libelle, resultat, unite')
          .eq('consultation_id', c.id)
          .not('resultat', 'is', null),
      ])

      setPrecedente({
        ...c,
        motifs: (c.motifs ?? []).map((m) => m.grille?.nom).filter(Boolean),
        traitement: [...(ordo?.lignes ?? [])]
          .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
          .map((l) => [l.medicament, l.posologie, l.duree].filter(Boolean).join(' — '))
          .join('\n'),
        resultats: (resultats ?? [])
          .map((r) => `${r.libelle} : ${r.resultat}${r.unite && r.unite !== '—' ? ' ' + r.unite : ''}`)
          .join('\n'),
      })
    })()
  }, [patientId, consultationId])

  if (!precedente) return null

  const copier = (cle, champ, valeur) => {
    if (!valeur?.trim()) return
    onCopier?.(champ, valeur.trim())
    setCopie(cle)
    setTimeout(() => setCopie(''), 2000)
  }

  const blocs = [
    ['diagnostic', 'Diagnostic', precedente.diagnostic, 'diagnostic'],
    ['cat', 'Conduite à tenir', precedente.conduite_a_tenir, 'conduite_a_tenir'],
    ['clinique', 'Examen clinique', precedente.examen_clinique, 'examen_clinique'],
    ['traitement', 'Traitement prescrit', precedente.traitement, null],
    ['resultats', 'Résultats reçus', precedente.resultats, 'examen_paraclinique'],
  ].filter(([, , v]) => v && String(v).trim())

  return (
    <section className="sans-impression mb-3 overflow-hidden rounded-xs border border-sarcelle-100 bg-white">
      <button
        onClick={() => setOuverte((v) => !v)}
        aria-expanded={ouverte}
        className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left transition hover:bg-sarcelle-50/60"
      >
        <History className="h-[15px] w-[15px] shrink-0 text-sarcelle" />
        <span className="text-[12.5px] font-medium text-ardoise">
          Consultation précédente du {dateFr(precedente.date_consultation)}
        </span>
        {precedente.motifs.length > 0 && (
          <span className="truncate text-[11.5px] text-encre/50">
            {precedente.motifs.join(' · ')}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-[14px] w-[14px] shrink-0 text-encre/40 transition ${ouverte ? 'rotate-180' : ''}`}
        />
      </button>

      {ouverte && (
        <div className="space-y-2 border-t border-sarcelle-100 px-3 py-3">
          {blocs.map(([cle, titre, valeur, champ]) => (
            <div key={cle} className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/40">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span className="etiquette flex-1">{titre}</span>
                {champ && (
                  <button
                    onClick={() => copier(cle, champ, valeur)}
                    className="flex items-center gap-1 text-[11px] text-sarcelle-600 hover:underline"
                  >
                    {copie === cle ? (
                      <>
                        <Check className="h-[11px] w-[11px]" /> copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-[11px] w-[11px]" /> reprendre
                      </>
                    )}
                  </button>
                )}
              </div>
              <pre className="fin max-h-32 overflow-auto whitespace-pre-wrap border-t border-sarcelle-100 bg-white px-2.5 py-1.5 font-sans text-[12px] leading-relaxed text-encre/80">
                {valeur}
              </pre>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link to={`/consultations/${precedente.id}`} className="btn-secondaire">
              Ouvrir la consultation {precedente.numero}
            </Link>
            <Link to={`/patients/${patientId}`} className="btn-fantome text-[12px]">
              <FolderOpen className="h-[13px] w-[13px]" /> Dossier complet
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
