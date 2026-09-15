import { useEffect, useId, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { chargerSuggestions, memoriserSaisie, chargerAbreviations, deplier } from '../lib/saisie'

/**
 * Champ texte avec autocomplétion issue de la table `suggestions`.
 * Le <datalist> natif a été retenu à dessein : il fonctionne au clavier,
 * sur mobile, et ne peut pas masquer le champ sur un petit écran.
 */
export function ChampSuggere({ label, domaine, valeur, onChange, memoriser = true, ...props }) {
  const id = useId()
  const [liste, setListe] = useState([])

  useEffect(() => {
    let vivant = true
    chargerSuggestions(domaine).then((l) => vivant && setListe(l))
    return () => {
      vivant = false
    }
  }, [domaine])

  return (
    <label className="block">
      {label && <span className="etiquette mb-1">{label}</span>}
      <input
        className="champ"
        list={id}
        value={valeur ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => memoriser && memoriserSaisie(domaine, valeur)}
        {...props}
      />
      <datalist id={id}>
        {liste.map((s) => (
          <option key={s.valeur} value={s.valeur}>
            {s.code ? `${s.code} — ${s.valeur}` : s.valeur}
          </option>
        ))}
      </datalist>
    </label>
  )
}

/**
 * Zone de texte où les abréviations se déplient à l'espace ou à l'entrée.
 * Taper « ecn » puis espace écrit la phrase complète.
 */
export function ZoneAssistee({ valeur, onChange, className = '', ...props }) {
  const ref = useRef(null)
  const [table, setTable] = useState(null)
  const [signal, setSignal] = useState(false)

  useEffect(() => {
    chargerAbreviations().then(setTable)
  }, [])

  const auClavier = (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    const zone = ref.current
    if (!zone) return
    const r = deplier(zone.value, zone.selectionStart, table)
    if (!r) return
    e.preventDefault()
    onChange(r.texte)
    setSignal(true)
    setTimeout(() => setSignal(false), 900)
    requestAnimationFrame(() => zone.setSelectionRange(r.position, r.position))
  }

  return (
    <span className="relative block">
      <textarea
        ref={ref}
        className={className || 'champ fin resize-y leading-relaxed'}
        value={valeur ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={auClavier}
        {...props}
      />
      {signal && (
        <span className="pointer-events-none absolute right-2 top-1.5 flex items-center gap-1 rounded-full bg-sarcelle-100 px-1.5 py-[1px] text-[10px] font-medium text-sarcelle-600">
          <Sparkles className="h-[10px] w-[10px]" /> déplié
        </span>
      )}
    </span>
  )
}
