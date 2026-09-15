import { useMemo } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { imc, interpretationImc } from '../../lib/format'
import Interrogatoire from '../Interrogatoire'
import { Carte } from '../ui'

/* Constantes montrées d'emblée ; les autres se déplient. */
const PRIORITAIRES = ['Poids', 'Taille', 'PA systolique', 'PA diastolique', 'Température']
const SELON_MOTIF = {
  obesite: ['Tour de taille', 'Tour de hanche', 'Tour de cou'],
  diabete: ['DEXTRO', 'Tour de taille'],
  croissance: ['Taille', 'Poids'],
}

export default function EtapeInterrogatoire({
  consultationId, patient, grilles, motifs, params, setParams, onValider, onProgression,
}) {
  const imcCalcule = useMemo(() => {
    const v = (l) => params.find((p) => p.libelle === l)?.valeur ?? ''
    return imc(v('Poids'), v('Taille'))
  }, [params])

  const attendues = useMemo(() => {
    const set = new Set(PRIORITAIRES)
    motifs.forEach((m) => (SELON_MOTIF[m] ?? []).forEach((x) => set.add(x)))
    return set
  }, [motifs])

  const majParam = (index, champ) => (e) =>
    setParams((l) => l.map((p, i) => (i === index ? { ...p, [champ]: e.target.value } : p)))

  const enAvant = params.filter((p) => attendues.has(p.libelle) && !p.calcule)
  const autres = params.filter((p) => !attendues.has(p.libelle) && !p.calcule)

  return (
    <div className="space-y-3">
      {/* -------------------------------------------------------- constantes */}
      <Carte
        titre="Constantes"
        sous="Mesurées à l’arrivée du patient. L’IMC se calcule tout seul."
      >
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {enAvant.map((p) => (
              <Constante
                key={p.libelle}
                p={p}
                onValeur={majParam(params.indexOf(p), 'valeur')}
                onRemarque={majParam(params.indexOf(p), 'remarque')}
              />
            ))}
            <div>
              <span className="etiquette mb-1">Indice de masse corporelle</span>
              <div className="flex h-[29px] items-center gap-2 rounded-xs border border-sarcelle-100 bg-sarcelle-50 px-2">
                <span className="tabular font-mono text-[13px] font-semibold text-sarcelle-600">
                  {imcCalcule || '—'}
                </span>
                <span className="truncate text-[11px] text-encre/55">
                  {interpretationImc(imcCalcule)}
                </span>
              </div>
            </div>
          </div>

          {autres.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-[12px] text-sarcelle-600 hover:underline">
                Autres paramètres ({autres.length})
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {autres.map((p) => (
                  <Constante
                    key={p.libelle}
                    p={p}
                    onValeur={majParam(params.indexOf(p), 'valeur')}
                    onRemarque={majParam(params.indexOf(p), 'remarque')}
                    onSupprimer={() =>
                      setParams((l) => l.filter((x) => x.libelle !== p.libelle))
                    }
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setParams((l) => [
                    ...l,
                    { libelle: '', valeur: '', unite: '', remarque: '', ordre: l.length + 50 },
                  ])
                }
                className="btn-secondaire mt-3"
              >
                <Plus className="h-[13px] w-[13px]" /> Ajouter un paramètre
              </button>
            </details>
          )}
        </div>
      </Carte>

      {/* ----------------------------------------------------- interrogatoire */}
      <div className="overflow-hidden rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
        <header className="border-b border-sarcelle-100 px-4 py-2.5">
          <h2 className="text-[13.5px] font-semibold text-ardoise">Interrogatoire</h2>
          <p className="text-[11.5px] text-encre/55">
            <kbd className="font-mono font-semibold">+</kbd> présent ·{' '}
            <kbd className="font-mono font-semibold">−</kbd> absent ·{' '}
            <kbd className="font-mono font-semibold">0</kbd> non exploré — le curseur descend seul.
          </p>
        </header>
        <Interrogatoire
          consultationId={consultationId}
          grilles={grilles}
          motifs={motifs}
          sexePatient={patient?.sexe}
          onValider={onValider}
          onProgression={onProgression}
        />
      </div>
    </div>
  )
}

function Constante({ p, onValeur, onRemarque, onSupprimer }) {
  return (
    <div>
      <span className="etiquette mb-1 flex items-center gap-1">
        {p.libelle || 'Nouveau paramètre'}
        {onSupprimer && (
          <button
            onClick={onSupprimer}
            className="ml-auto text-encre/25 transition hover:text-alerte"
            aria-label={`Retirer ${p.libelle}`}
          >
            <Trash2 className="h-[12px] w-[12px]" />
          </button>
        )}
      </span>
      <div className="relative">
        <input
          className="champ pr-10 text-right"
          inputMode="decimal"
          value={p.valeur ?? ''}
          onChange={onValeur}
        />
        {p.unite && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-encre/40">
            {p.unite}
          </span>
        )}
      </div>
      {p.valeur && (
        <input
          className="champ mt-1 py-[3px] text-[11.5px]"
          placeholder="remarque"
          value={p.remarque ?? ''}
          onChange={onRemarque}
        />
      )}
    </div>
  )
}
