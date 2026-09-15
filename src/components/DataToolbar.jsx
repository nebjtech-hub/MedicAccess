import { Search, FileSpreadsheet, RotateCcw } from 'lucide-react'

export function Recherche({ valeur, onChange, placeholder = 'Rechercher…', className = 'w-64' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-encre/35" />
      <input
        className="champ pl-7"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
    </div>
  )
}

export function BoutonExport({ onClick, desactive, libelle = 'Exporter en Excel' }) {
  return (
    <button onClick={onClick} disabled={desactive} className="btn-secondaire" title={libelle}>
      <FileSpreadsheet className="h-[14px] w-[14px]" />
      <span className="hidden sm:inline">Excel</span>
    </button>
  )
}

export function BoutonReinitialiser({ onClick, visible }) {
  if (!visible) return null
  return (
    <button onClick={onClick} className="btn-fantome text-[12px]">
      <RotateCcw className="h-[13px] w-[13px]" /> Réinitialiser
    </button>
  )
}

/** Bandeau de filtres au-dessus d'une liste. */
export function ZoneFiltres({ children, resultat, actions }) {
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-sarcelle-100 bg-sarcelle-50/40 px-4 py-3">
      {children}
      <div className="ml-auto flex items-center gap-2">
        {resultat != null && (
          <span className="tabular mr-1 text-[11.5px] text-encre/50">
            {resultat} résultat{resultat > 1 ? 's' : ''}
          </span>
        )}
        {actions}
      </div>
    </div>
  )
}

/** Petit champ de filtre compact avec étiquette au-dessus. */
export function Filtre({ label, children, className = '' }) {
  return (
    <div className={className}>
      <span className="etiquette mb-1">{label}</span>
      {children}
    </div>
  )
}
