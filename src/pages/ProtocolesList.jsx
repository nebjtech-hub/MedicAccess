import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, Copy, Pill } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { chargerGrilles } from '../lib/interrogatoire'
import { Carte, Chargement, Vide, Alerte, Champ, Choix, Case, Puce } from '../components/ui'
import { ChampSuggere } from '../components/ChampsAssistes'

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Sachet', 'Injectable', 'Suppositoire', 'Pommade', 'Collyre']
const LIGNE_VIDE = { medicament: '', dosage: '', forme: '', posologie: '', duree: '', quantite: '', instructions: '' }
const VIDE = { nom: '', indication: '', grille_id: '', partage: false, actif: true, lignes: [{ ...LIGNE_VIDE }] }

export default function ProtocolesList() {
  const { medecin } = useAuth()
  const [protocoles, setProtocoles] = useState([])
  const [grilles, setGrilles] = useState([])
  const [selection, setSelection] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  const charger = async () => {
    const { data } = await supabase
      .from('protocoles')
      .select('*, grille:grilles(code, nom), lignes:protocoles_lignes(*)')
      .order('nom')
    const liste = (data ?? []).map((p) => ({
      ...p,
      lignes: [...(p.lignes ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    }))
    setProtocoles(liste)
    return liste
  }

  useEffect(() => {
    Promise.all([charger(), chargerGrilles().catch(() => [])]).then(([liste, g]) => {
      setGrilles(g)
      if (liste.length) setSelection(liste[0])
      setChargement(false)
    })
  }, [])

  const maj = (k) => (e) =>
    setSelection((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const majLigne = (i, champ) => (valeur) =>
    setSelection((s) => ({
      ...s,
      lignes: s.lignes.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)),
    }))

  const enregistrer = async () => {
    if (!selection?.nom?.trim()) {
      setErreur('Donnez un nom au protocole.')
      return
    }
    const lignes = selection.lignes.filter((l) => l.medicament.trim())
    if (!lignes.length) {
      setErreur('Ajoutez au moins un médicament.')
      return
    }
    setEnvoi(true)
    setErreur('')

    const entete = {
      nom: selection.nom.trim(),
      indication: selection.indication?.trim() || null,
      grille_id: selection.grille_id || null,
      partage: !!selection.partage,
      actif: selection.actif !== false,
      medecin_id: selection.medecin_id ?? medecin?.id ?? null,
    }

    const requete = selection.id
      ? supabase.from('protocoles').update(entete).eq('id', selection.id).select('id').single()
      : supabase.from('protocoles').insert(entete).select('id').single()

    const { data, error } = await requete
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      setEnvoi(false)
      return
    }

    await supabase.from('protocoles_lignes').delete().eq('protocole_id', data.id)
    const { error: err2 } = await supabase.from('protocoles_lignes').insert(
      lignes.map((l, i) => ({
        protocole_id: data.id,
        medicament: l.medicament.trim(),
        dosage: l.dosage?.trim() || null,
        forme: l.forme || null,
        posologie: l.posologie?.trim() || null,
        duree: l.duree?.trim() || null,
        quantite: l.quantite?.trim() || null,
        instructions: l.instructions?.trim() || null,
        ordre: i,
      }))
    )
    setEnvoi(false)
    if (err2) {
      setErreur(`Les lignes n’ont pas pu être enregistrées : ${err2.message}`)
      return
    }
    const liste = await charger()
    setSelection(liste.find((p) => p.id === data.id) ?? null)
    setMessage('Protocole enregistré.')
    setTimeout(() => setMessage(''), 2600)
  }

  const supprimer = async () => {
    if (!selection?.id) {
      setSelection(null)
      return
    }
    const { error } = await supabase.from('protocoles').delete().eq('id', selection.id)
    if (error) {
      setErreur(`Suppression impossible : ${error.message}`)
      return
    }
    const liste = await charger()
    setSelection(liste[0] ?? null)
  }

  if (chargement) return <Chargement />

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">
            Protocoles de prescription
          </h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] text-encre/55">
            Vos ordonnances types, rattachées à un motif. Elles seront proposées lors de la
            consultation — jamais pré-cochées. Aucun protocole n’est livré avec le logiciel : le
            contenu thérapeutique vient de vous.
          </p>
        </div>
        <button onClick={() => setSelection({ ...VIDE })} className="btn-primaire">
          <Plus className="h-[14px] w-[14px]" /> Nouveau protocole
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Carte titre="Mes protocoles">
          {protocoles.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-encre/55">Aucun protocole.</p>
          ) : (
            <ul className="divide-y divide-sarcelle-100">
              {protocoles.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelection(p)}
                    className={`w-full px-3 py-2.5 text-left transition ${
                      selection?.id === p.id ? 'bg-sarcelle-50' : 'hover:bg-sarcelle-50/60'
                    }`}
                  >
                    <span className="block truncate text-[12.5px] font-medium text-ardoise">
                      {p.nom}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-encre/50">
                      {p.grille?.nom ?? 'Tous motifs'}
                      <span className="tabular font-mono">{p.lignes?.length ?? 0} lignes</span>
                      {p.partage && <Puce ton="Validé">partagé</Puce>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        {!selection ? (
          <Carte>
            <Vide
              icone={Pill}
              titre="Aucun protocole sélectionné"
              texte="Choisissez un protocole à gauche ou créez-en un nouveau."
              action={
                <button onClick={() => setSelection({ ...VIDE })} className="btn-primaire">
                  <Plus className="h-[14px] w-[14px]" /> Nouveau protocole
                </button>
              }
            />
          </Carte>
        ) : (
          <Carte
            titre={selection.id ? 'Modifier le protocole' : 'Nouveau protocole'}
            action={
              <div className="flex items-center gap-2">
                {message && <span className="text-[12px] font-medium text-[#2c6435]">{message}</span>}
                {selection.id && (
                  <>
                    <button
                      onClick={() =>
                        setSelection((s) => ({ ...s, id: undefined, nom: `${s.nom} (copie)` }))
                      }
                      className="btn-fantome text-[12px]"
                    >
                      <Copy className="h-[13px] w-[13px]" /> Dupliquer
                    </button>
                    <button onClick={supprimer} className="btn-danger">
                      <Trash2 className="h-[13px] w-[13px]" /> Supprimer
                    </button>
                  </>
                )}
                <button onClick={enregistrer} disabled={envoi} className="btn-primaire">
                  <Save className="h-[14px] w-[14px]" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            }
          >
            <div className="space-y-3 p-4">
              {erreur && <Alerte>{erreur}</Alerte>}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
                <Champ
                  label="Nom du protocole"
                  value={selection.nom ?? ''}
                  onChange={maj('nom')}
                  placeholder="Hyperthyroïdie — traitement d’attaque"
                />
                <Choix
                  label="Motif"
                  vide="Tous motifs"
                  options={grilles.map((g) => ({ value: g.id, label: g.nom }))}
                  value={selection.grille_id ?? ''}
                  onChange={maj('grille_id')}
                />
                <div className="flex items-end pb-1">
                  <Case
                    label="Partagé avec l’équipe"
                    checked={!!selection.partage}
                    onChange={maj('partage')}
                  />
                </div>
              </div>

              <Champ
                label="Indication"
                value={selection.indication ?? ''}
                onChange={maj('indication')}
                placeholder="Quand employer ce protocole — visible en infobulle"
              />

              <div className="overflow-x-auto fin rounded-xs border border-sarcelle-100">
                <table className="grille min-w-[820px]">
                  <thead>
                    <tr>
                      <th className="w-[22%]">Médicament</th>
                      <th className="w-[11%]">Dosage</th>
                      <th className="w-[12%]">Forme</th>
                      <th className="w-[18%]">Posologie</th>
                      <th className="w-[11%]">Durée</th>
                      <th className="w-[9%]">Quantité</th>
                      <th>Instructions</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {(selection.lignes ?? []).map((l, i) => (
                      <tr key={i}>
                        <td>
                          <ChampSuggere
                            domaine="medicament"
                            valeur={l.medicament ?? ''}
                            onChange={majLigne(i, 'medicament')}
                            placeholder="Nom"
                          />
                        </td>
                        <td>
                          <input className="champ py-[3px]" value={l.dosage ?? ''}
                            onChange={(e) => majLigne(i, 'dosage')(e.target.value)} placeholder="500 mg" />
                        </td>
                        <td>
                          <select className="champ py-[3px]" value={l.forme ?? ''}
                            onChange={(e) => majLigne(i, 'forme')(e.target.value)}>
                            <option value="">—</option>
                            {FORMES.map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input className="champ py-[3px]" value={l.posologie ?? ''}
                            onChange={(e) => majLigne(i, 'posologie')(e.target.value)} placeholder="1 cp × 2/jour" />
                        </td>
                        <td>
                          <input className="champ py-[3px]" value={l.duree ?? ''}
                            onChange={(e) => majLigne(i, 'duree')(e.target.value)} placeholder="3 mois" />
                        </td>
                        <td>
                          <input className="champ py-[3px]" value={l.quantite ?? ''}
                            onChange={(e) => majLigne(i, 'quantite')(e.target.value)} />
                        </td>
                        <td>
                          <input className="champ py-[3px]" value={l.instructions ?? ''}
                            onChange={(e) => majLigne(i, 'instructions')(e.target.value)} placeholder="Au repas" />
                        </td>
                        <td>
                          <button
                            onClick={() =>
                              setSelection((s) => ({
                                ...s,
                                lignes: s.lignes.length > 1 ? s.lignes.filter((_, j) => j !== i) : s.lignes,
                              }))
                            }
                            className="text-encre/25 transition hover:text-alerte"
                            aria-label="Retirer la ligne"
                          >
                            <Trash2 className="h-[13px] w-[13px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() =>
                  setSelection((s) => ({ ...s, lignes: [...(s.lignes ?? []), { ...LIGNE_VIDE }] }))
                }
                className="btn-secondaire"
              >
                <Plus className="h-[14px] w-[14px]" /> Ajouter un médicament
              </button>
            </div>
          </Carte>
        )}
      </div>
    </div>
  )
}
