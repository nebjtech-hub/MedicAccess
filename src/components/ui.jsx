import { useEffect } from 'react'
import { X, Loader2, Inbox } from 'lucide-react'

/* ------------------------------------------------------------------ champs */

export function Champ({ label, className = '', suffixe, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="etiquette mb-1">{label}</span>}
      <span className="relative block">
        <input className={`champ ${suffixe ? 'pr-11' : ''}`} {...props} />
        {suffixe && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-encre/45">
            {suffixe}
          </span>
        )}
      </span>
    </label>
  )
}

export function Choix({ label, options = [], vide = '—', className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="etiquette mb-1">{label}</span>}
      <select className="champ" {...props}>
        {vide !== null && <option value="">{vide}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const t = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {t}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export function Zone({ label, className = '', rows = 3, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="etiquette mb-1">{label}</span>}
      <textarea className="champ fin resize-y leading-relaxed" rows={rows} {...props} />
    </label>
  )
}

export function Case({ label, ...props }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-[12.5px]">
      <input
        type="checkbox"
        className="h-[15px] w-[15px] rounded-xs border-sarcelle-100 text-sarcelle accent-[#0E7C86]"
        {...props}
      />
      {label}
    </label>
  )
}

/* --------------------------------------------------- panneaux et conteneurs */

const TEINTES = {
  cyan: ['bg-panneau-cyan', 'border-panneau-cyanb', 'text-[#0d5c6b]'],
  ambre: ['bg-panneau-ambre', 'border-panneau-ambreb', 'text-[#8a5010]'],
  rose: ['bg-panneau-rose', 'border-panneau-roseb', 'text-[#8f2b2b]'],
  vert: ['bg-panneau-vert', 'border-panneau-vertb', 'text-[#2c6435]'],
  jaune: ['bg-panneau-jaune', 'border-panneau-jauneb', 'text-[#75651a]'],
  neutre: ['bg-sarcelle-50', 'border-sarcelle-100', 'text-ardoise/75'],
}

/** Panneau au code couleur du logiciel de consultation existant. */
export function Panneau({ titre, teinte = 'neutre', action, children, className = '' }) {
  const [fond, bord, texte] = TEINTES[teinte] ?? TEINTES.neutre
  return (
    <section className={`panneau ${bord} ${className}`}>
      <header className={`panneau-titre ${fond} ${bord} ${texte}`}>
        <span>{titre}</span>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

export function Carte({ titre, sous, action, children, className = '' }) {
  return (
    <section className={`rounded-xs border border-sarcelle-100 bg-white shadow-fiche ${className}`}>
      {(titre || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-sarcelle-100 px-4 py-2.5">
          <div>
            <h2 className="text-[13.5px] font-semibold text-ardoise">{titre}</h2>
            {sous && <p className="text-[11.5px] text-encre/55">{sous}</p>}
          </div>
          {action}
        </header>
      )}
      <div>{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ statuts */

const PUCES = {
  'En cours': 'bg-panneau-ambre text-[#8a5010]',
  Terminée: 'bg-panneau-vert text-[#2c6435]',
  Annulée: 'bg-panneau-rose text-[#8f2b2b]',
  Brouillon: 'bg-black/[.06] text-encre/60',
  Validé: 'bg-sarcelle-100 text-sarcelle-600',
  Signé: 'bg-panneau-vert text-[#2c6435]',
  Demandé: 'bg-panneau-jaune text-[#75651a]',
  'Résultat disponible': 'bg-panneau-vert text-[#2c6435]',
}

export function Puce({ children, ton }) {
  return <span className={`puce ${PUCES[ton ?? children] ?? 'bg-black/[.06] text-encre/60'}`}>{children}</span>
}

/* -------------------------------------------------------------------- états */

export function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-[12.5px] text-encre/55">
      <Loader2 className="h-4 w-4 animate-spin" />
      {texte}
    </div>
  )
}

export function Vide({ titre, texte, action, icone: Icone = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Icone className="h-7 w-7 text-sarcelle-400" strokeWidth={1.5} />
      <p className="text-[13.5px] font-semibold text-ardoise">{titre}</p>
      {texte && <p className="max-w-sm text-[12.5px] text-encre/55">{texte}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Alerte({ children, ton = 'erreur' }) {
  if (!children) return null
  const styles =
    ton === 'erreur'
      ? 'border-alerte/25 bg-alerte/[.05] text-alerte'
      : 'border-panneau-vertb bg-panneau-vert text-[#2c6435]'
  return <div className={`rounded-xs border px-3 py-2 text-[12.5px] ${styles}`}>{children}</div>
}

/* ------------------------------------------------------------------ modales */

export function Modale({ ouverte, onFermer, titre, sous, taille = 'md', pied, children }) {
  useEffect(() => {
    if (!ouverte) return
    const esc = (e) => e.key === 'Escape' && onFermer?.()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [ouverte, onFermer])

  if (!ouverte) return null
  const largeurs = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-encre/45 p-4 backdrop-blur-[2px] sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`w-full ${largeurs[taille]} rounded-xs border border-sarcelle-100 bg-white shadow-fiche`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-sarcelle-100 px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ardoise">{titre}</h2>
            {sous && <p className="text-[11.5px] text-encre/55">{sous}</p>}
          </div>
          <button onClick={onFermer} className="btn-fantome -mr-1.5 px-1.5" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto fin px-4 py-4">{children}</div>
        {pied && (
          <footer className="flex items-center justify-end gap-2 border-t border-sarcelle-100 bg-sarcelle-50/50 px-4 py-3">
            {pied}
          </footer>
        )}
      </div>
    </div>
  )
}
