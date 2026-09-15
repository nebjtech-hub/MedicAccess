import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Save, Copy, LayoutTemplate } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CATALOGUE_VARIABLES, composerCompteRendu, construireContexte } from '../lib/templates'
import { Carte, Chargement, Vide, Alerte, Champ, Choix, Case, Puce } from '../components/ui'

const CATEGORIES = ['Consultation', 'Imagerie', 'Biologie', 'Opératoire', 'Certificat', 'Courrier']

/* Dossier fictif servant à l'aperçu : le médecin voit le rendu réel du
   modèle sans avoir à ouvrir une consultation. */
const EXEMPLE = {
  patient: {
    nom: 'Ndong Beh',
    prenom: 'Fadran Chandra',
    code: '110081-26',
    sexe: 'Masculin',
    date_naissance: '1996-03-29',
    telephone: '074225248',
    ville: 'Libreville',
    organisme_assurance: 'CNAMGS',
    numero_secu: '241-96-0329-118',
    regime_assurance: 'Secteur privé',
    taux_couverture: 80,
    convention: 'BGFI',
    groupe_sanguin: 'O+',
    allergies: 'Pénicilline',
  },
  consultation: {
    numero: 'CS-2026-00147',
    date_consultation: new Date().toISOString(),
    type_consultation: 'Consultation',
    motif: 'Céphalées et fièvre depuis trois jours',
    histoire_maladie:
      'Début brutal il y a trois jours, fièvre vespérale à 39 °C, céphalées frontales, courbatures. Automédication par paracétamol sans amélioration franche.',
    examen_clinique:
      'Patient conscient, bien orienté. Conjonctives normocolorées. Auscultation cardio-pulmonaire sans particularité. Abdomen souple, foie et rate non palpables.',
    examen_paraclinique: 'TDR paludisme positif. NFS : leucocytes 6 200/mm³, plaquettes 148 000/mm³.',
    diagnostic: 'Paludisme simple à Plasmodium falciparum',
    conduite_a_tenir:
      'Artéméther-luméfantrine 20/120 mg, 4 comprimés matin et soir pendant 3 jours. Paracétamol 1 g × 3/jour si fièvre. Contrôle clinique à J7.',
  },
  parametres: [
    { libelle: 'Poids', valeur: '78', unite: 'kg' },
    { libelle: 'Taille', valeur: '176', unite: 'cm' },
    { libelle: 'Température', valeur: '38,9', unite: '°C' },
    { libelle: 'PA systolique', valeur: '124', unite: 'mmHg' },
    { libelle: 'PA diastolique', valeur: '78', unite: 'mmHg' },
    { libelle: 'Oxymétrie', valeur: '98', unite: '%' },
    { libelle: 'Fréquence Cardiaque', valeur: '88', unite: 'bpm' },
    { libelle: 'Indice de masse corporelle', valeur: '25.2', unite: 'kg/m²' },
  ],
  compteRendu: { numero: 'CR-2026-00092' },
}

const MODELE_VIDE = {
  nom: '',
  categorie: 'Consultation',
  entete: '',
  corps: '',
  pied: '',
  partage: false,
  actif: true,
}

export default function ModelesList() {
  const { medecin } = useAuth()
  const [modeles, setModeles] = useState([])
  const [selection, setSelection] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [champCible, setChampCible] = useState('corps')
  const refs = { entete: useRef(null), corps: useRef(null), pied: useRef(null) }

  const charger = async () => {
    const { data } = await supabase.from('modeles_compte_rendu').select('*').order('nom')
    setModeles(data ?? [])
    setChargement(false)
    return data ?? []
  }

  useEffect(() => {
    charger().then((liste) => {
      if (liste.length) setSelection(liste[0])
    })
  }, [])

  const maj = (k) => (e) =>
    setSelection((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const insererVariable = (cle) => {
    const zone = refs[champCible]?.current
    const jeton = `{{${cle}}}`
    if (!zone) {
      setSelection((s) => ({ ...s, [champCible]: (s?.[champCible] ?? '') + jeton }))
      return
    }
    const { selectionStart: a, selectionEnd: b, value } = zone
    setSelection((s) => ({ ...s, [champCible]: value.slice(0, a) + jeton + value.slice(b) }))
    requestAnimationFrame(() => {
      zone.focus()
      zone.setSelectionRange(a + jeton.length, a + jeton.length)
    })
  }

  const enregistrer = async () => {
    if (!selection?.nom?.trim()) {
      setErreur('Donnez un nom au modèle.')
      return
    }
    setEnvoi(true)
    setErreur('')
    const charge = {
      nom: selection.nom.trim(),
      categorie: selection.categorie,
      entete: selection.entete || null,
      corps: selection.corps ?? '',
      pied: selection.pied || null,
      partage: !!selection.partage,
      actif: selection.actif !== false,
      medecin_id: selection.medecin_id ?? medecin?.id ?? null,
    }

    const requete = selection.id
      ? supabase.from('modeles_compte_rendu').update(charge).eq('id', selection.id).select().single()
      : supabase.from('modeles_compte_rendu').insert(charge).select().single()

    const { data, error } = await requete
    setEnvoi(false)
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      return
    }
    await charger()
    setSelection(data)
    setMessage('Modèle enregistré.')
    setTimeout(() => setMessage(''), 2600)
  }

  const supprimer = async () => {
    if (!selection?.id) {
      setSelection(null)
      return
    }
    const { error } = await supabase.from('modeles_compte_rendu').delete().eq('id', selection.id)
    if (error) {
      setErreur(`Suppression impossible : ${error.message}`)
      return
    }
    const liste = await charger()
    setSelection(liste[0] ?? null)
  }

  const dupliquer = () =>
    setSelection((s) => ({ ...s, id: undefined, nom: `${s.nom} (copie)`, medecin_id: medecin?.id ?? null }))

  const contexteExemple = construireContexte({ ...EXEMPLE, medecin })
  const apercu = selection ? composerCompteRendu(selection, contexteExemple) : ''

  if (chargement) return <Chargement />

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">Modèles de compte rendu</h1>
          <p className="mt-0.5 text-[12.5px] text-encre/55">
            Composez vos documents types et placez les données du patient là où vous les voulez.
          </p>
        </div>
        <button onClick={() => setSelection({ ...MODELE_VIDE })} className="btn-primaire">
          <Plus className="h-[14px] w-[14px]" /> Nouveau modèle
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* ------------------------------------------------------- liste */}
        <Carte titre="Mes modèles">
          {modeles.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-encre/55">Aucun modèle enregistré.</p>
          ) : (
            <ul className="divide-y divide-sarcelle-100">
              {modeles.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelection(m)}
                    className={`w-full px-3 py-2.5 text-left transition ${
                      selection?.id === m.id ? 'bg-sarcelle-50' : 'hover:bg-sarcelle-50/60'
                    }`}
                  >
                    <span className="block truncate text-[12.5px] font-medium text-ardoise">{m.nom}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-encre/50">
                      {m.categorie}
                      {m.partage && <Puce ton="Validé">partagé</Puce>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        {/* ------------------------------------------------------ éditeur */}
        {!selection ? (
          <Carte>
            <Vide
              icone={LayoutTemplate}
              titre="Aucun modèle sélectionné"
              texte="Choisissez un modèle à gauche ou créez-en un nouveau."
              action={
                <button onClick={() => setSelection({ ...MODELE_VIDE })} className="btn-primaire">
                  <Plus className="h-[14px] w-[14px]" /> Nouveau modèle
                </button>
              }
            />
          </Carte>
        ) : (
          <div className="space-y-3">
            <Carte
              titre={selection.id ? 'Modifier le modèle' : 'Nouveau modèle'}
              action={
                <div className="flex items-center gap-2">
                  {message && <span className="text-[12px] font-medium text-[#2c6435]">{message}</span>}
                  {selection.id && (
                    <>
                      <button onClick={dupliquer} className="btn-fantome text-[12px]">
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

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
                  <Champ label="Nom du modèle" value={selection.nom ?? ''} onChange={maj('nom')} placeholder="Compte rendu de consultation" />
                  <Choix label="Catégorie" vide={null} options={CATEGORIES} value={selection.categorie ?? 'Consultation'} onChange={maj('categorie')} />
                  <div className="flex items-end pb-1">
                    <Case label="Partagé avec l’équipe" checked={!!selection.partage} onChange={maj('partage')} />
                  </div>
                </div>

                {/* pastilles de variables */}
                <div className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="etiquette">Insérer dans</span>
                    <div className="flex gap-1">
                      {[
                        ['entete', 'En-tête'],
                        ['corps', 'Corps'],
                        ['pied', 'Pied'],
                      ].map(([cle, libelle]) => (
                        <button
                          key={cle}
                          onClick={() => setChampCible(cle)}
                          className={`rounded-xs px-2 py-[3px] text-[11.5px] transition ${
                            champCible === cle
                              ? 'bg-sarcelle text-white'
                              : 'border border-sarcelle-100 bg-white text-ardoise hover:border-sarcelle-400'
                          }`}
                        >
                          {libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-[190px] space-y-2.5 overflow-y-auto fin">
                    {CATALOGUE_VARIABLES.map((g) => (
                      <div key={g.groupe}>
                        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.06em] text-encre/45">
                          {g.groupe}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {g.variables.map(([cle, libelle]) => (
                            <button
                              key={cle}
                              onClick={() => insererVariable(cle)}
                              title={`{{${cle}}}`}
                              className="rounded-full border border-sarcelle-100 bg-white px-2 py-[3px] text-[11px] text-ardoise transition hover:border-sarcelle-400 hover:bg-white"
                            >
                              {libelle}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <ZoneModele label="En-tête" refZone={refs.entete} valeur={selection.entete} onChange={maj('entete')} onFocus={() => setChampCible('entete')} lignes={3} />
                <ZoneModele label="Corps du document" refZone={refs.corps} valeur={selection.corps} onChange={maj('corps')} onFocus={() => setChampCible('corps')} lignes={14} />
                <ZoneModele label="Pied de page et signature" refZone={refs.pied} valeur={selection.pied} onChange={maj('pied')} onFocus={() => setChampCible('pied')} lignes={3} />
              </div>
            </Carte>

            <Carte titre="Aperçu" sous="Rendu avec un dossier patient d'exemple">
              <div className="bg-brume p-4">
                <div className="mx-auto max-w-[720px] border border-sarcelle-100 bg-white px-9 py-9 shadow-fiche">
                  <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.7] text-encre">
                    {apercu || 'Le modèle est vide.'}
                  </pre>
                </div>
              </div>
            </Carte>
          </div>
        )}
      </div>
    </div>
  )
}

function ZoneModele({ label, refZone, valeur, onChange, onFocus, lignes }) {
  return (
    <label className="block">
      <span className="etiquette mb-1">{label}</span>
      <textarea
        ref={refZone}
        className="champ fin resize-y font-mono text-[12px] leading-[1.7]"
        rows={lignes}
        value={valeur ?? ''}
        onChange={onChange}
        onFocus={onFocus}
      />
    </label>
  )
}
