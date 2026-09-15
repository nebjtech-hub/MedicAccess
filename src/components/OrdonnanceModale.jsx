import { useState } from 'react'
import { Plus, Trash2, Printer, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Modale, Alerte, Zone } from './ui'
import { age, dateFr, jourLong } from '../lib/format'

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Sachet', 'Injectable', 'Suppositoire', 'Pommade', 'Collyre', 'Aérosol']
const LIGNE_VIDE = { medicament: '', dosage: '', forme: '', posologie: '', duree: '', quantite: '', instructions: '' }

export default function OrdonnanceModale({ ouverte, onFermer, consultation, patient, medecin, onEnregistre }) {
  const [lignes, setLignes] = useState([{ ...LIGNE_VIDE }])
  const [note, setNote] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const maj = (i, champ) => (e) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: e.target.value } : x)))

  const enregistrer = async ({ puisImprimer = false } = {}) => {
    const utiles = lignes.filter((l) => l.medicament.trim())
    if (!utiles.length) {
      setErreur('Ajoutez au moins un médicament avant d’enregistrer.')
      return
    }
    setEnvoi(true)
    setErreur('')

    const { data, error } = await supabase
      .from('ordonnances')
      .insert({
        patient_id: patient.id,
        consultation_id: consultation.id,
        medecin_id: medecin?.id ?? null,
        note: note.trim() || null,
      })
      .select('id, numero')
      .single()

    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      setEnvoi(false)
      return
    }

    const { error: err2 } = await supabase.from('ordonnance_lignes').insert(
      utiles.map((l, i) => ({
        ordonnance_id: data.id,
        medicament: l.medicament.trim(),
        dosage: l.dosage.trim() || null,
        forme: l.forme || null,
        posologie: l.posologie.trim() || null,
        duree: l.duree.trim() || null,
        quantite: l.quantite.trim() || null,
        instructions: l.instructions.trim() || null,
        ordre: i,
      }))
    )
    setEnvoi(false)
    if (err2) {
      setErreur(`Les lignes n’ont pas pu être enregistrées : ${err2.message}`)
      return
    }
    if (puisImprimer) imprimer({ numero: data.numero, lignes: utiles, note, patient, medecin })
    setLignes([{ ...LIGNE_VIDE }])
    setNote('')
    onEnregistre?.()
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Ordonnance"
      sous={`${patient?.nom ?? ''} ${patient?.prenom ?? ''} — dossier ${patient?.code ?? ''}`}
      taille="xl"
      pied={
        <>
          <button onClick={onFermer} className="btn-fantome">
            Annuler
          </button>
          <button onClick={() => enregistrer({ puisImprimer: true })} disabled={envoi} className="btn-secondaire">
            <Printer className="h-[14px] w-[14px]" /> Enregistrer et imprimer
          </button>
          <button onClick={() => enregistrer()} disabled={envoi} className="btn-primaire">
            <Save className="h-[14px] w-[14px]" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}

        <div className="overflow-x-auto fin rounded-xs border border-sarcelle-100">
          <table className="grille min-w-[860px]">
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
              {lignes.map((l, i) => (
                <tr key={i}>
                  <td>
                    <input className="champ py-[3px]" value={l.medicament} onChange={maj(i, 'medicament')} placeholder="Paracétamol" />
                  </td>
                  <td>
                    <input className="champ py-[3px]" value={l.dosage} onChange={maj(i, 'dosage')} placeholder="500 mg" />
                  </td>
                  <td>
                    <select className="champ py-[3px]" value={l.forme} onChange={maj(i, 'forme')}>
                      <option value="">—</option>
                      {FORMES.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input className="champ py-[3px]" value={l.posologie} onChange={maj(i, 'posologie')} placeholder="1 cp × 3/jour" />
                  </td>
                  <td>
                    <input className="champ py-[3px]" value={l.duree} onChange={maj(i, 'duree')} placeholder="5 jours" />
                  </td>
                  <td>
                    <input className="champ py-[3px]" value={l.quantite} onChange={maj(i, 'quantite')} placeholder="1 bte" />
                  </td>
                  <td>
                    <input className="champ py-[3px]" value={l.instructions} onChange={maj(i, 'instructions')} placeholder="Après les repas" />
                  </td>
                  <td>
                    <button
                      onClick={() => setLignes((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))}
                      className="text-encre/25 transition hover:text-alerte"
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="h-[13px] w-[13px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="btn-secondaire">
          <Plus className="h-[14px] w-[14px]" /> Ajouter un médicament
        </button>

        <Zone
          label="Note au pharmacien"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ne pas substituer, renouvellement autorisé…"
        />
      </div>
    </Modale>
  )
}

/* Impression via une fenêtre dédiée : le rendu papier ne dépend pas du thème
   de l'application et reste lisible sur une imprimante noir et blanc. */
function imprimer({ numero, lignes, note, patient, medecin }) {
  const echapper = (s = '') =>
    String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

  const corps = lignes
    .map(
      (l, i) => `<li>
        <strong>${echapper(l.medicament)} ${echapper(l.dosage)}</strong>
        ${l.forme ? ` — ${echapper(l.forme)}` : ''}
        ${l.quantite ? ` — ${echapper(l.quantite)}` : ''}
        <div class="pos">${echapper(l.posologie)}${l.duree ? ` · pendant ${echapper(l.duree)}` : ''}${
        l.instructions ? ` · ${echapper(l.instructions)}` : ''
      }</div>
      </li>`
    )
    .join('')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>Ordonnance ${echapper(numero)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    body { font-family: Georgia, 'Times New Roman', serif; color:#111; font-size:12pt; }
    header { border-bottom:1.5pt solid #111; padding-bottom:8pt; margin-bottom:14pt; }
    h1 { font-size:13pt; letter-spacing:.06em; text-transform:uppercase; margin:0 0 2pt; }
    .meta { font-size:9.5pt; color:#444; }
    .pat { margin-bottom:14pt; font-size:11pt; }
    ol { padding-left:18pt; }
    li { margin-bottom:10pt; }
    .pos { font-size:10.5pt; color:#333; font-style:italic; }
    .note { margin-top:14pt; font-size:10.5pt; border-left:2pt solid #999; padding-left:8pt; }
    footer { margin-top:34pt; text-align:right; font-size:11pt; }
  </style></head><body>
    <header>
      <h1>${echapper(medecin?.etablissement || 'Centre Diagnostic — Libreville')}</h1>
      <div class="meta">${echapper(medecin?.civilite || 'Dr')} ${echapper(medecin?.nom || '')} ${echapper(
    medecin?.prenom || ''
  )} — ${echapper(medecin?.specialite || 'Médecine générale')}${
    medecin?.numero_ordre ? ` · N° Ordre ${echapper(medecin.numero_ordre)}` : ''
  }</div>
    </header>
    <div class="pat">
      <strong>ORDONNANCE ${echapper(numero)}</strong><br>
      ${echapper(patient?.nom || '')} ${echapper(patient?.prenom || '')} — dossier ${echapper(patient?.code || '')}<br>
      ${patient?.sexe ? echapper(patient.sexe) + ', ' : ''}${
    patient?.date_naissance ? `${age(patient.date_naissance)} ans (né(e) le ${dateFr(patient.date_naissance)})` : ''
  }
    </div>
    <ol>${corps}</ol>
    ${note?.trim() ? `<div class="note">${echapper(note)}</div>` : ''}
    <footer>
      Fait à Libreville, le ${jourLong()}<br><br><br>
      ${echapper(medecin?.civilite || 'Dr')} ${echapper(medecin?.nom || '')} ${echapper(medecin?.prenom || '')}
    </footer>
  </body></html>`

  const w = window.open('', '_blank', 'width=860,height=1000')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
