import { useMemo } from 'react'
import {
  ClipboardList, Shield, Brain, Droplet, Flame, Bone, Users, Scale, Ruler, Circle,
} from 'lucide-react'
import { fusionner } from '../lib/interrogatoire'

const ICONES = {
  'clipboard-text': ClipboardList,
  shield: Shield,
  brain: Brain,
  droplet: Droplet,
  flame: Flame,
  bone: Bone,
  venus: Users,
  scale: Scale,
  'ruler-measure': Ruler,
}

/**
 * Tuiles de motifs, sélection multiple. Le décompte affiché tient compte de
 * la mutualisation : deux motifs qui partagent des signes n'additionnent pas
 * leurs questions.
 */
export default function MotifSelector({ grilles, retenus, onChange, sexePatient, compact }) {
  const bilan = useMemo(
    () => fusionner(grilles, retenus, sexePatient),
    [grilles, retenus, sexePatient]
  )

  const basculer = (code) =>
    onChange(retenus.includes(code) ? retenus.filter((c) => c !== code) : [...retenus, code])

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-2 ${
          compact
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        }`}
      >
        {grilles.map((g) => {
          const Icone = ICONES[g.icone] ?? Circle
          const actif = retenus.includes(g.code)
          return (
            <button
              key={g.code}
              type="button"
              aria-pressed={actif}
              onClick={() => basculer(g.code)}
              className={`flex flex-col items-start gap-1.5 rounded-xs border p-3 text-left transition ${
                actif
                  ? 'border-sarcelle bg-sarcelle-50 text-sarcelle-600 shadow-[inset_0_0_0_1px_rgba(14,124,134,.25)]'
                  : 'border-sarcelle-100 bg-white text-encre hover:border-sarcelle-400'
              }`}
            >
              <Icone
                className={`h-[19px] w-[19px] ${actif ? 'text-sarcelle' : 'text-encre/45'}`}
                strokeWidth={1.7}
              />
              <span className="text-[13px] font-medium leading-tight">{g.nom}</span>
              <span
                className={`tabular font-mono text-[10.5px] ${
                  actif ? 'text-sarcelle-600' : 'text-encre/40'
                }`}
              >
                {g.nbItems} questions
              </span>
            </button>
          )
        })}
      </div>

      <p className="tabular text-[12px] text-encre/60" aria-live="polite">
        {retenus.length === 0 ? (
          'Aucun motif sélectionné.'
        ) : (
          <>
            {retenus.length} motif{retenus.length > 1 ? 's' : ''} · {bilan.nbDistincts} questions
            {bilan.nbMutualises > 0 && (
              <span className="text-sarcelle-600">
                {' '}
                · {bilan.nbMutualises} question{bilan.nbMutualises > 1 ? 's' : ''} mutualisée
                {bilan.nbMutualises > 1 ? 's' : ''}
              </span>
            )}
          </>
        )}
      </p>
    </div>
  )
}
