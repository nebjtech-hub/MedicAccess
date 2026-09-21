import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Filet de sécurité : une erreur JavaScript non rattrapée vide l'écran
 * sans rien dire. Ici elle s'affiche, avec le message et la pile, pour
 * qu'un problème de production soit diagnosticable sans ouvrir la console.
 */
export default class GardeErreur extends Component {
  constructor(props) {
    super(props)
    this.state = { erreur: null, pile: null }
  }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidCatch(erreur, info) {
    this.setState({ pile: info?.componentStack })
    console.error('Erreur non rattrapée :', erreur, info)
  }

  render() {
    if (!this.state.erreur) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-brume px-4 py-10">
        <div className="w-full max-w-xl rounded-xs border border-alerte/25 bg-white p-6 shadow-fiche">
          <div className="mb-3 flex items-center gap-2 text-alerte">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-[17px] font-semibold">L’écran n’a pas pu s’afficher</h1>
          </div>
          <p className="text-[13px] text-encre/70">
            Les données déjà enregistrées ne sont pas perdues : la consultation reprend à
            l’étape où elle en était.
          </p>

          <pre className="fin mt-3 max-h-48 overflow-auto rounded-xs border border-sarcelle-100 bg-sarcelle-50/50 p-3 font-mono text-[11px] text-encre/70">
            {String(this.state.erreur?.message ?? this.state.erreur)}
            {this.state.pile ? `\n${this.state.pile}` : ''}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => window.location.reload()} className="btn-primaire">
              <RotateCcw className="h-[14px] w-[14px]" /> Recharger
            </button>
            <a href="/tableau-de-bord" className="btn-secondaire">
              Revenir au tableau de bord
            </a>
          </div>

          <p className="mt-3 text-[11.5px] text-encre/50">
            Transmettez ce message au développeur : il indique précisément l’origine du
            problème.
          </p>
        </div>
      </div>
    )
  }
}
