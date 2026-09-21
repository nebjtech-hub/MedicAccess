import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Printer, RefreshCw, Save, CheckCircle2, Signature } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { composerCompteRendu, construireContexte, fusionner } from '../../lib/templates'
import { calculerTout } from '../../lib/calculs'
import { age } from '../../lib/format'
import { jourLong } from '../../lib/format'
import { Carte, Alerte, Puce } from '../ui'

export default function EtapeCompteRendu({
  consultation, patient, medecin, params, motifsNoms, interrogatoire,
  motifsCodes, grilles, onRetour, onCloturer,
}) {
  const [cr, setCr] = useState(null)
  const [modele, setModele] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [etat, setEtat] = useState({ message: '', erreur: '' })
  const [perime, setPerime] = useState(false)
  // React.StrictMode joue deux fois les effets en développement : sans ce
  // verrou, deux insertions partent en parallèle et la seconde heurte
  // l'index unique du compte rendu de consultation.
  const genere = useRef(false)

  /** Choisit le modèle : celui du premier motif retenu, sinon celui par défaut. */
  const construire = useCallback(async () => {
    const ids = grilles.filter((g) => motifsCodes.includes(g.code)).map((g) => g.id)

    let { data: mods } = await supabase
      .from('modeles_compte_rendu')
      .select('*')
      .eq('actif', true)
      .or(`grille_id.in.(${ids.length ? ids.join(',') : '00000000-0000-0000-0000-000000000000'}),par_defaut.eq.true`)

    const parMotif = (mods ?? []).find((m) => m.grille_id && ids.includes(m.grille_id))
    const parDefaut = (mods ?? []).find((m) => m.par_defaut)
    const choisi = parMotif ?? parDefaut ?? null
    setModele(choisi)

    const [{ data: examens }, { data: ordo }, { data: anterieurs }] = await Promise.all([
      // Les examens DE CETTE consultation : ceux prescrits comme ceux
      // dont le résultat a été saisi le jour même.
      supabase
        .from('examens_demandes')
        .select('libelle, urgent, type, unite, resultat, statut, prescrit')
        .eq('consultation_id', consultation.id)
        .order('date_demande'),
      supabase
        .from('ordonnances')
        .select('lignes:ordonnance_lignes(medicament, dosage, forme, posologie, duree, instructions, ordre)')
        .eq('consultation_id', consultation.id)
        .maybeSingle(),
      // Résultats des consultations PRÉCÉDENTES, pour situer l'évolution.
      // Disponibles dans les modèles via {{examens.anterieurs}}, absents
      // du modèle par défaut.
      supabase
        .from('examens_demandes')
        .select('libelle, resultat, unite, date_resultat')
        .eq('patient_id', patient.id)
        .neq('consultation_id', consultation.id)
        .eq('statut', 'Résultat disponible')
        .not('resultat', 'is', null)
        .order('date_resultat', { ascending: false })
        .limit(20),
    ])

    // Les valeurs calculées sont recomposées à partir des constantes et
    // des résultats, pour que le compte rendu les reprenne.
    const mesures = {}
    params.forEach((p) => {
      if (String(p.valeur ?? '').trim()) mesures[p.libelle] = p.valeur
    })
    // Seuls les résultats du jour alimentent les calculs : un DFG
    // recalculé sur une créatinine d'il y a six mois serait trompeur.
    ;(examens ?? []).forEach((e) => {
      if (e.resultat) mesures[e.libelle] = e.resultat
    })
    const calculs = calculerTout(mesures, {
      age: patient?.date_naissance ? age(patient.date_naissance) : null,
      sexe: patient?.sexe,
    })

    const contexte = construireContexte({
      patient,
      consultation,
      parametres: params,
      medecin,
      motifs: motifsNoms,
      interrogatoire,
      examens: examens ?? [],
      ordonnance: [...(ordo?.lignes ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
      resultats: (examens ?? []).filter((e) => e.resultat),
      anterieurs: anterieurs ?? [],
      calculs,
    })

    return { contexte, modele: choisi }
  }, [grilles, motifsCodes, consultation, patient, params, medecin, motifsNoms, interrogatoire])

  /* Génération à l'arrivée, ou reprise du compte rendu déjà produit. */
  useEffect(() => {
    if (genere.current) return
    genere.current = true
    ;(async () => {
      // Le plus récent fait foi. On évite maybeSingle() : s'il existe
      // plusieurs comptes rendus pour la consultation, il renvoie une erreur
      // et l'on repartirait à tort sur une création.
      const recuperer = async () => {
        const { data } = await supabase
          .from('comptes_rendus')
          .select('*')
          .eq('consultation_id', consultation.id)
          .eq('categorie', 'Consultation')
          .order('created_at', { ascending: false })
          .limit(1)
        return data?.[0] ?? null
      }

      const existant = await recuperer()

      const { contexte, modele: m } = await construire()

      if (existant) {
        setCr(existant)
        // Le texte est figé à la génération. Si la consultation a bougé
        // depuis, on le signale plutôt que d'afficher un document
        // silencieusement dépassé.
        const { data: dernier } = await supabase
          .from('examens_demandes')
          .select('date_demande')
          .eq('consultation_id', consultation.id)
          .order('date_demande', { ascending: false })
          .limit(1)
        const reperes = [
          dernier?.[0]?.date_demande,
          consultation.updated_at,
        ].filter(Boolean)
        const edite = new Date(existant.updated_at ?? existant.created_at).getTime()
        setPerime(reperes.some((d) => new Date(d).getTime() > edite + 2000))
        setChargement(false)
        return
      }
      const contenu = m
        ? composerCompteRendu(m, contexte)
        : fusionner('COMPTE RENDU DE CONSULTATION\n\n{{interrogatoire.complet}}', contexte)

      const { data, error } = await supabase
        .from('comptes_rendus')
        .insert({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          modele_id: m?.id ?? null,
          titre: m?.nom ?? 'Compte rendu de consultation',
          categorie: 'Consultation',
          contenu,
          statut: 'Brouillon',
        })
        .select()
        .maybeSingle()

      if (error) {
        // 23505 : un compte rendu vient d'être créé en parallèle — on le reprend
        const deja = error.code === '23505' ? await recuperer() : null
        if (deja) setCr(deja)
        else setEtat({ message: '', erreur: `Compte rendu non créé : ${error.message}` })
      } else {
        setCr(data)
      }
      setChargement(false)
    })()
  }, [])

  /** Reconstruit le texte depuis le modèle en écrasant les retouches. */
  const regenerer = async () => {
    const { contexte, modele: m } = await construire()
    if (!m) return
    setCr((c) => ({ ...c, contenu: composerCompteRendu(m, contexte) }))
    setPerime(false)
    setEtat({ message: 'Compte rendu régénéré depuis le modèle.', erreur: '' })
    setTimeout(() => setEtat((e) => ({ ...e, message: '' })), 2600)
  }

  const enregistrer = async (supplement = {}) => {
    setEnvoi(true)
    const charge = {
      contenu: cr.contenu,
      titre: cr.titre,
      statut: supplement.statut ?? cr.statut,
      ...(supplement.statut === 'Signé' ? { date_signature: new Date().toISOString() } : {}),
    }
    const { error } = await supabase.from('comptes_rendus').update(charge).eq('id', cr.id)
    setEnvoi(false)
    if (error) {
      setEtat({ message: '', erreur: `Enregistrement impossible : ${error.message}` })
      return false
    }
    if (supplement.statut) setCr((c) => ({ ...c, statut: supplement.statut }))
    setEtat({ message: 'Compte rendu enregistré.', erreur: '' })
    setTimeout(() => setEtat((e) => ({ ...e, message: '' })), 2600)
    return true
  }

  const imprimer = () => {
    const echapper = (s = '') =>
      String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <title>${echapper(cr.titre)}</title><style>
      @page { margin: 20mm 18mm; }
      body { font-family: Georgia, 'Times New Roman', serif; font-size:11.5pt; line-height:1.6; color:#111; }
      header { border-bottom:1.5pt solid #111; padding-bottom:6pt; margin-bottom:16pt; font-size:9.5pt; color:#333; }
      pre { white-space:pre-wrap; font-family:inherit; margin:0; }
      footer { margin-top:26pt; font-size:9.5pt; color:#555; border-top:.5pt solid #bbb; padding-top:6pt; }
      </style></head><body>
      <header>${echapper(medecin?.etablissement || 'Centre Diagnostic — Libreville')} · ${echapper(cr.numero ?? '')} · Dossier ${echapper(patient?.code ?? '')}</header>
      <pre>${echapper(cr.contenu)}</pre>
      <footer>Édité le ${jourLong()} par ${echapper(medecin?.civilite || 'Dr')} ${echapper(medecin?.nom || '')} ${echapper(medecin?.prenom || '')}</footer>
      </body></html>`
    const w = window.open('', '_blank', 'width=880,height=1000')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  const cloturer = async () => {
    if (!(await enregistrer())) return
    onCloturer()
  }

  if (chargement)
    return (
      <p className="py-14 text-center text-[12.5px] text-encre/55">Génération du compte rendu…</p>
    )
  if (!cr)
    return (
      <div className="space-y-3">
        <Alerte>{etat.erreur || 'Le compte rendu n’a pas pu être créé.'}</Alerte>
        <button onClick={onRetour} className="btn-secondaire">
          <ArrowLeft className="h-[14px] w-[14px]" /> Retour aux prescriptions
        </button>
      </div>
    )

  return (
    <div className="space-y-3">
      {etat.erreur && <Alerte>{etat.erreur}</Alerte>}

      {perime && (
        <div className="flex flex-wrap items-center gap-3 rounded-xs border border-panneau-ambreb bg-panneau-ambre px-3 py-2 text-[12.5px] text-[#8a5010]">
          <span className="flex-1">
            Ce compte rendu a été généré avant vos dernières modifications de la
            consultation. Il ne les reprend pas.
          </span>
          <button onClick={regenerer} className="btn-secondaire">
            <RefreshCw className="h-[13px] w-[13px]" /> Régénérer maintenant
          </button>
        </div>
      )}

      <Carte
        titre={cr.titre}
        sous={
          modele
            ? `Généré depuis le modèle « ${modele.nom} ». Modifiable librement.`
            : 'Aucun modèle trouvé : texte minimal généré.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Puce>{cr.statut}</Puce>
            {etat.message && (
              <span className="text-[12px] font-medium text-[#2c6435]">{etat.message}</span>
            )}
            <button onClick={regenerer} className="btn-fantome text-[12px]" title="Écrase vos retouches">
              <RefreshCw className="h-[13px] w-[13px]" /> Régénérer
            </button>
            <button onClick={imprimer} className="btn-secondaire">
              <Printer className="h-[14px] w-[14px]" /> Imprimer
            </button>
            <button onClick={() => enregistrer()} disabled={envoi} className="btn-secondaire">
              <Save className="h-[14px] w-[14px]" /> Enregistrer
            </button>
          </div>
        }
      >
        <textarea
          className="fin block min-h-[46vh] w-full resize-y border-0 px-4 py-4 font-mono text-[12.5px] leading-[1.75] outline-none"
          value={cr.contenu ?? ''}
          onChange={(e) => setCr((c) => ({ ...c, contenu: e.target.value }))}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-sarcelle-100 bg-sarcelle-50/40 px-4 py-2.5">
          {cr.statut === 'Brouillon' && (
            <button onClick={() => enregistrer({ statut: 'Validé' })} className="btn-secondaire">
              <CheckCircle2 className="h-[14px] w-[14px]" /> Valider
            </button>
          )}
          {cr.statut === 'Validé' && (
            <button onClick={() => enregistrer({ statut: 'Signé' })} className="btn-secondaire">
              <Signature className="h-[14px] w-[14px]" /> Signer
            </button>
          )}
        </div>
      </Carte>

      <div className="flex items-center justify-between gap-2">
        <button onClick={onRetour} className="btn-secondaire">
          <ArrowLeft className="h-[14px] w-[14px]" /> Prescriptions
        </button>
        <button onClick={cloturer} disabled={envoi} className="btn-primaire">
          <CheckCircle2 className="h-[14px] w-[14px]" /> Clôturer la consultation
        </button>
      </div>
    </div>
  )
}
