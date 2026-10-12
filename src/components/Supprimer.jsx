import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Modale, Alerte } from './ui'

/**
 * Suppression d'un patient ou d'une consultation.
 *
 * Un dossier médical ne se supprime pas d'un clic : la confirmation
 * exige de recopier un mot, et l'écran annonce précisément ce qui va
 * disparaître. Les suppressions en cascade de la base emportent les
 * consultations, réponses, comptes rendus, ordonnances et examens.
 */
export default function Supprimer({
  type, // 'patient' | 'consultation' | 'compte_rendu'
  id,
  libelle, // ce que le médecin voit : nom du patient ou n° de consultation
  onSupprime,
  bouton = 'icone', // 'icone' | 'texte'
}) {
  const [ouverte, setOuverte] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [detail, setDetail] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const motCle = 'SUPPRIMER'

  const ouvrir = async () => {
    setOuverte(true)
    setSaisie('')
    setErreur('')
    setDetail(null)

    if (type === 'compte_rendu') {
      // Un compte rendu ne porte rien d'autre : rien à dénombrer.
      setDetail({})
      return
    }

    if (type === 'patient') {
      const [c, cr, o, e] = await Promise.all([
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('comptes_rendus').select('id', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('ordonnances').select('id', { count: 'exact', head: true }).eq('patient_id', id),
        supabase.from('examens_demandes').select('id', { count: 'exact', head: true }).eq('patient_id', id),
      ])
      setDetail({
        consultations: c.count ?? 0,
        comptesRendus: cr.count ?? 0,
        ordonnances: o.count ?? 0,
        examens: e.count ?? 0,
      })
    } else {
      const [cr, o, e, r] = await Promise.all([
        supabase.from('comptes_rendus').select('id', { count: 'exact', head: true }).eq('consultation_id', id),
        supabase.from('ordonnances').select('id', { count: 'exact', head: true }).eq('consultation_id', id),
        supabase.from('examens_demandes').select('id', { count: 'exact', head: true }).eq('consultation_id', id),
        supabase.from('consultation_reponses').select('id', { count: 'exact', head: true }).eq('consultation_id', id),
      ])
      setDetail({
        comptesRendus: cr.count ?? 0,
        ordonnances: o.count ?? 0,
        examens: e.count ?? 0,
        reponses: r.count ?? 0,
      })
    }
  }

  const supprimer = async () => {
    if (saisie.trim().toUpperCase() !== motCle) {
      setErreur(`Recopiez ${motCle} pour confirmer.`)
      return
    }
    setEnvoi(true)
    setErreur('')
    const table =
      type === 'patient' ? 'patients' : type === 'compte_rendu' ? 'comptes_rendus' : 'consultations'
    const { error } = await supabase.from(table).delete().eq('id', id)
    setEnvoi(false)
    if (error) {
      setErreur(`Suppression impossible : ${error.message}`)
      return
    }
    setOuverte(false)
    onSupprime?.()
  }

  const lignes = detail
    ? Object.entries({
        'Consultations': detail.consultations,
        'Réponses d’interrogatoire': detail.reponses,
        'Comptes rendus': detail.comptesRendus,
        'Ordonnances': detail.ordonnances,
        'Examens et résultats': detail.examens,
      }).filter(([, n]) => n !== undefined)
    : []

  return (
    <>
      {bouton === 'texte' ? (
        <button onClick={ouvrir} className="btn-danger">
          <Trash2 className="h-[13px] w-[13px]" /> Supprimer
        </button>
      ) : (
        <button
          onClick={ouvrir}
          className="text-encre/25 transition hover:text-alerte"
          aria-label={`Supprimer ${libelle}`}
          title="Supprimer"
        >
          <Trash2 className="h-[14px] w-[14px]" />
        </button>
      )}

      <Modale
        ouverte={ouverte}
        onFermer={() => setOuverte(false)}
        titre={
          type === 'patient'
            ? 'Supprimer ce patient'
            : type === 'compte_rendu'
              ? 'Supprimer ce compte rendu'
              : 'Supprimer cette consultation'
        }
        sous={libelle}
        taille="sm"
        pied={
          <>
            <button onClick={() => setOuverte(false)} className="btn-fantome">
              Annuler
            </button>
            <button onClick={supprimer} disabled={envoi} className="btn-danger">
              <Trash2 className="h-[13px] w-[13px]" />
              {envoi ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {erreur && <Alerte>{erreur}</Alerte>}

          <div className="flex items-start gap-2 rounded-xs border border-alerte/25 bg-alerte/[.05] px-3 py-2 text-[12.5px] text-alerte">
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>
              Cette suppression est définitive. La base ne conserve aucune corbeille et les
              données ne pourront pas être récupérées.
            </span>
          </div>

          {detail && lignes.length > 0 && (
            <div>
              <p className="etiquette mb-1.5">Disparaîtra également</p>
              <ul className="divide-y divide-sarcelle-100 rounded-xs border border-sarcelle-100">
                {lignes.map(([nom, n]) => (
                  <li key={nom} className="flex items-center justify-between px-2.5 py-1.5 text-[12.5px]">
                    <span className={n > 0 ? 'text-encre' : 'text-encre/45'}>{nom}</span>
                    <span className={`tabular font-mono ${n > 0 ? 'font-semibold text-alerte' : 'text-encre/35'}`}>
                      {n}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="block">
            <span className="etiquette mb-1">
              Recopiez <strong className="font-mono text-alerte">{motCle}</strong> pour confirmer
            </span>
            <input
              className="champ font-mono uppercase"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && supprimer()}
              autoFocus
            />
          </label>
        </div>
      </Modale>
    </>
  )
}
