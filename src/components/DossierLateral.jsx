import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X, Stethoscope, FileText, Pill, FlaskConical, ClipboardList,
  Copy, Check, ChevronDown, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateFr, dateHeureFr } from '../lib/format'
import { Chargement } from './ui'

const ONGLETS = [
  { cle: 'consultations', libelle: 'Consultations', icone: Stethoscope },
  { cle: 'comptesRendus', libelle: 'Comptes rendus', icone: FileText },
  { cle: 'ordonnances', libelle: 'Ordonnances', icone: Pill },
  { cle: 'examens', libelle: 'Examens', icone: FlaskConical },
  { cle: 'antecedents', libelle: 'Antécédents', icone: ClipboardList },
]

/**
 * Dossier du patient ouvert à côté de la consultation.
 *
 * Le médecin consulte l'historique sans perdre sa saisie en cours :
 * sur grand écran le panneau prend sa place à droite et la consultation
 * se resserre ; sur petit écran il se superpose. Chaque élément peut
 * être recopié dans la consultation ou dans le presse-papier.
 */
export default function DossierLateral({ patient, consultationId, onFermer, onCopier }) {
  const [onglet, setOnglet] = useState('consultations')
  const [d, setD] = useState(null)
  const [ouvert, setOuvert] = useState(null)
  const [copie, setCopie] = useState('')

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onFermer?.()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onFermer])

  useEffect(() => {
    if (!patient?.id) return
    let vivant = true
    ;(async () => {
      const [cs, cr, ord, ex, ant] = await Promise.all([
        supabase
          .from('consultations')
          .select('id, numero, date_consultation, diagnostic, conduite_a_tenir, examen_clinique, plaintes, histoire_maladie, antecedents')
          .eq('patient_id', patient.id)
          .neq('id', consultationId)
          .order('date_consultation', { ascending: false })
          .limit(12),
        supabase
          .from('comptes_rendus')
          .select('id, numero, titre, statut, date_cr, contenu')
          .eq('patient_id', patient.id)
          .order('date_cr', { ascending: false })
          .limit(12),
        supabase
          .from('ordonnances')
          .select('id, numero, date_ordonnance, note, lignes:ordonnance_lignes(medicament, posologie, duree, instructions, ordre)')
          .eq('patient_id', patient.id)
          .order('date_ordonnance', { ascending: false })
          .limit(12),
        supabase
          .from('examens_demandes')
          .select('id, libelle, resultat, unite, statut, date_demande, date_resultat')
          .eq('patient_id', patient.id)
          .order('date_demande', { ascending: false })
          .limit(60),
        supabase
          .from('antecedents')
          .select('id, type, libelle, annee, description')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false }),
      ])
      if (!vivant) return
      const ordonnances = (ord.data ?? []).map((o) => ({
        ...o,
        lignes: [...(o.lignes ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
      }))

      setD({
        consultations: cs.data ?? [],
        comptesRendus: cr.data ?? [],
        ordonnances,
        examens: ex.data ?? [],
        antecedents: ant.data ?? [],
      })
    })()
    return () => {
      vivant = false
    }
  }, [patient?.id, consultationId])

  const marquer = (cle) => {
    setCopie(cle)
    setTimeout(() => setCopie(''), 1800)
  }

  const versPressePapier = async (cle, texte) => {
    try {
      await navigator.clipboard.writeText(texte)
      marquer(cle)
    } catch {
      // Le navigateur peut refuser hors contexte sécurisé : on ne bloque pas
    }
  }

  const reprendre = (cle, champ, texte) => {
    if (!texte?.trim()) return
    onCopier?.(champ, texte.trim())
    marquer(cle)
  }

  /* ---------------------------------------------------------- fragments */
  const Bloc = ({ cle, titre, texte, champ }) =>
    !texte?.trim() ? null : (
      <div className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/40">
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="etiquette flex-1">{titre}</span>
          {champ && (
            <button
              onClick={() => reprendre(`${cle}-r`, champ, texte)}
              className="text-[10.5px] text-sarcelle-600 hover:underline"
            >
              {copie === `${cle}-r` ? 'repris' : 'reprendre'}
            </button>
          )}
          <button
            onClick={() => versPressePapier(`${cle}-c`, texte)}
            className="text-encre/35 transition hover:text-sarcelle"
            aria-label="Copier"
          >
            {copie === `${cle}-c` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <pre className="fin max-h-36 overflow-auto whitespace-pre-wrap border-t border-sarcelle-100 bg-white px-2 py-1.5 font-sans text-[11.5px] leading-relaxed text-encre/80">
          {texte}
        </pre>
      </div>
    )

  const Repliable = ({ id, entete, children }) => (
    <li className="border-b border-sarcelle-100 last:border-0">
      <button
        onClick={() => setOuvert(ouvert === id ? null : id)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-sarcelle-50/60"
      >
        {entete}
        <ChevronDown
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-encre/35 transition ${ouvert === id ? 'rotate-180' : ''}`}
        />
      </button>
      {ouvert === id && <div className="space-y-1.5 px-3 pb-3">{children}</div>}
    </li>
  )

  const resultats = useMemo(
    () => (d?.examens ?? []).filter((e) => e.resultat),
    [d]
  )

  /* Le traitement en cours est ce que le médecin cherche en premier sur
     un contrôle : il reste visible en haut, sans ouvrir d'onglet. */
  const traitement = useMemo(() => {
    const derniere = d?.ordonnances?.[0]
    if (!derniere?.lignes?.length) return null
    return {
      date: derniere.date_ordonnance,
      numero: derniere.numero,
      texte: derniere.lignes
        .map((l) => [l.medicament, l.posologie, l.duree, l.instructions].filter(Boolean).join(' — '))
        .join('\n'),
    }
  }, [d])

  const contenu = () => {
    if (!d) return <Chargement texte="Ouverture du dossier…" />

    if (onglet === 'consultations')
      return !d.consultations.length ? (
        <Vide texte="Aucune consultation antérieure." />
      ) : (
        <ul>
          {d.consultations.map((c) => (
            <Repliable
              key={c.id}
              id={c.id}
              entete={
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-ardoise">
                    {dateFr(c.date_consultation)}
                    <span className="ml-1.5 font-mono text-[10px] text-encre/40">{c.numero}</span>
                  </span>
                  <span className="block truncate text-[11px] text-encre/55">
                    {c.diagnostic || 'Diagnostic non renseigné'}
                  </span>
                </span>
              }
            >
              <Bloc cle={`${c.id}-d`} titre="Diagnostic" texte={c.diagnostic} champ="diagnostic" />
              <Bloc cle={`${c.id}-c`} titre="Conduite à tenir" texte={c.conduite_a_tenir} champ="conduite_a_tenir" />
              <Bloc cle={`${c.id}-e`} titre="Examen clinique" texte={c.examen_clinique} champ="examen_clinique" />
              <Bloc cle={`${c.id}-p`} titre="Plaintes" texte={c.plaintes} champ="plaintes" />
              <Bloc cle={`${c.id}-h`} titre="Histoire de la maladie" texte={c.histoire_maladie} champ="histoire_maladie" />
              <Link to={`/consultations/${c.id}`} className="btn-fantome text-[11.5px]">
                <ExternalLink className="h-3 w-3" /> Ouvrir cette consultation
              </Link>
            </Repliable>
          ))}
        </ul>
      )

    if (onglet === 'comptesRendus')
      return !d.comptesRendus.length ? (
        <Vide texte="Aucun compte rendu." />
      ) : (
        <ul>
          {d.comptesRendus.map((c) => (
            <Repliable
              key={c.id}
              id={c.id}
              entete={
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ardoise">{c.titre}</span>
                  <span className="block text-[11px] text-encre/55">
                    {dateFr(c.date_cr)} · {c.statut}
                  </span>
                </span>
              }
            >
              <Bloc cle={`${c.id}-t`} titre="Contenu" texte={c.contenu} champ="histoire_maladie" />
              <Link to={`/comptes-rendus/${c.id}`} className="btn-fantome text-[11.5px]">
                <ExternalLink className="h-3 w-3" /> Ouvrir le compte rendu
              </Link>
            </Repliable>
          ))}
        </ul>
      )

    if (onglet === 'ordonnances')
      return !d.ordonnances.length ? (
        <Vide texte="Aucune ordonnance." />
      ) : (
        <ul>
          {d.ordonnances.map((o) => {
            const texte = o.lignes
              .map((l) => [l.medicament, l.posologie, l.duree, l.instructions].filter(Boolean).join(' — '))
              .join('\n')
            return (
              <Repliable
                key={o.id}
                id={o.id}
                entete={
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-ardoise">
                      {dateFr(o.date_ordonnance)}
                      <span className="ml-1.5 font-mono text-[10px] text-encre/40">{o.numero}</span>
                    </span>
                    <span className="block truncate text-[11px] text-encre/55">
                      {o.lignes.map((l) => l.medicament).join(', ') || 'Vide'}
                    </span>
                  </span>
                }
              >
                <Bloc cle={`${o.id}-o`} titre="Traitement" texte={texte} champ="conduite_a_tenir" />
                {o.note && <Bloc cle={`${o.id}-n`} titre="Note" texte={o.note} />}
              </Repliable>
            )
          })}
        </ul>
      )

    if (onglet === 'examens')
      return !resultats.length ? (
        <Vide texte="Aucun résultat saisi." />
      ) : (
        <div className="p-3">
          <Bloc
            cle="tous-res"
            titre="Tous les résultats"
            champ="examen_paraclinique"
            texte={resultats
              .map(
                (e) =>
                  `${e.libelle} : ${e.resultat}${e.unite && e.unite !== '—' ? ' ' + e.unite : ''}` +
                  `${e.date_resultat ? ` (${dateFr(e.date_resultat)})` : ''}`
              )
              .join('\n')}
          />
          <ul className="mt-2 divide-y divide-sarcelle-100 rounded-xs border border-sarcelle-100">
            {resultats.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2 px-2 py-1.5 text-[11.5px]">
                <span className="min-w-0 flex-1 truncate">{e.libelle}</span>
                <span className="tabular shrink-0 font-mono text-encre/80">
                  {e.resultat} {e.unite && e.unite !== '—' ? e.unite : ''}
                </span>
                <span className="shrink-0 text-[10px] text-encre/40">{dateFr(e.date_resultat)}</span>
              </li>
            ))}
          </ul>
        </div>
      )

    return !d.antecedents.length ? (
      <Vide texte="Aucun antécédent consigné." />
    ) : (
      <ul className="divide-y divide-sarcelle-100">
        {d.antecedents.map((a) => (
          <li key={a.id} className="px-3 py-2">
            <span className="block text-[12px] font-medium text-ardoise">
              {a.libelle}
              {a.annee && <span className="ml-1.5 font-mono text-[10px] text-encre/45">{a.annee}</span>}
            </span>
            <span className="block text-[11px] text-encre/55">
              {a.type}
              {a.description ? ` · ${a.description}` : ''}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      {/* Voile sur petit écran seulement : sur grand écran le panneau
          prend sa place à côté de la consultation, qui reste lisible. */}
      <button
        aria-label="Fermer le dossier"
        onClick={onFermer}
        className="sans-impression fixed inset-0 z-30 bg-encre/30 lg:hidden"
      />

      <aside
        className="sans-impression fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col
                   border-l border-sarcelle-100 bg-white shadow-fiche
                   lg:sticky lg:top-12 lg:z-0 lg:h-[calc(100vh-3rem)] lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-none"
      >
        <header className="flex items-start gap-2 border-b border-sarcelle-100 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ardoise">
              {patient?.nom} {patient?.prenom}
            </p>
            <p className="truncate text-[11px] text-encre/55">
              <span className="font-mono">{patient?.code}</span>
              {patient?.groupe_sanguin && ` · ${patient.groupe_sanguin}`}
            </p>
          </div>
          <Link to={`/patients/${patient?.id}`} className="btn-fantome px-1.5 text-[11px]" title="Dossier complet">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button onClick={onFermer} className="btn-fantome px-1.5" aria-label="Fermer le dossier">
            <X className="h-4 w-4" />
          </button>
        </header>

        {patient?.allergies && (
          <div className="flex items-start gap-1.5 border-b border-panneau-roseb bg-panneau-rose px-3 py-1.5 text-[11.5px] text-[#8f2b2b]">
            <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            <span>{patient.allergies}</span>
          </div>
        )}

        {traitement && (
          <div className="border-b border-sarcelle-100 bg-panneau-vert/40 px-3 py-2">
            <div className="mb-1 flex items-center gap-2">
              <Pill className="h-3.5 w-3.5 shrink-0 text-[#2c6435]" />
              <span className="etiquette flex-1 text-[#2c6435]">
                Traitement en cours · {dateFr(traitement.date)}
              </span>
              <button
                onClick={() => reprendre('trait-r', 'conduite_a_tenir', traitement.texte)}
                className="text-[10.5px] text-[#2c6435] underline"
              >
                {copie === 'trait-r' ? 'repris' : 'reprendre'}
              </button>
              <button
                onClick={() => versPressePapier('trait-c', traitement.texte)}
                className="text-[#2c6435]/50 transition hover:text-[#2c6435]"
                aria-label="Copier le traitement"
              >
                {copie === 'trait-c' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <pre className="fin max-h-24 overflow-auto whitespace-pre-wrap rounded-xs border border-panneau-vertb bg-white px-2 py-1.5 font-sans text-[11px] leading-relaxed text-encre/80">
              {traitement.texte}
            </pre>
          </div>
        )}

        <nav className="flex gap-0.5 overflow-x-auto fin border-b border-sarcelle-100 px-1.5">
          {ONGLETS.map(({ cle, libelle, icone: Icone }) => (
            <button
              key={cle}
              onClick={() => setOnglet(cle)}
              className={`-mb-px flex shrink-0 items-center gap-1 border-b-2 px-2 py-1.5 text-[11.5px] transition ${
                onglet === cle
                  ? 'border-sarcelle font-semibold text-sarcelle-600'
                  : 'border-transparent text-encre/55 hover:text-ardoise'
              }`}
            >
              <Icone className="h-3.5 w-3.5" />
              {libelle}
              {d?.[cle]?.length > 0 && (
                <span className="tabular font-mono text-[10px] text-encre/40">{d[cle].length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto fin">{contenu()}</div>
      </aside>
    </>
  )
}

const Vide = ({ texte }) => (
  <p className="px-3 py-8 text-center text-[12px] text-encre/50">{texte}</p>
)
