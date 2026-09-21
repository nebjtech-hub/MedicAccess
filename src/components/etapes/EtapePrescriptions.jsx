import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowLeft, Plus, Trash2, Info, Link2, Pill, FlaskConical, Calculator,
  Search, Loader2, BookOpen, ChevronDown, ClipboardList, Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { chargerBilans } from '../../lib/interrogatoire'
import { memoriserSaisie } from '../../lib/saisie'
import { calculerTout, calculsIncomplets, calculPourExamen } from '../../lib/calculs'
import {
  chargerExamensRef, trouverExamen, uniteProposee, situerResultat,
  chargerMedicamentsRef, trouverMedicament, chargerOrdonnancesTypes,
} from '../../lib/referentiel'
import { age } from '../../lib/format'
import { Carte, Alerte, Case, Choix } from '../ui'
import { ChampSuggere, ZoneAssistee } from '../ChampsAssistes'

const POSOLOGIES = ['1 cp/jour', '1 cp × 2/jour', '1 cp × 3/jour', '½ cp/jour', '2 cp/jour']
const LIGNE_VIDE = { medicament: '', posologie: '', duree: '', quantite: '', instructions: '' }

/** Situe un résultat par rapport aux bornes du référentiel, sans juger. */
function Situation({ valeur, unite, ref_ }) {
  const s = situerResultat(valeur, unite, ref_)
  if (!s) return <span className="w-[74px] shrink-0" />
  const styles = {
    normal: 'bg-panneau-vert text-[#2c6435]',
    bas: 'bg-panneau-ambre text-[#8a5010]',
    eleve: 'bg-panneau-rose text-[#8f2b2b]',
  }
  return (
    <span
      className={`puce w-[74px] shrink-0 justify-center ${styles[s.statut]}`}
      title={s.reference ? `Référence : ${s.reference}` : ''}
    >
      {s.libelle}
    </span>
  )
}

/** Fiche du référentiel thérapeutique, repliée par défaut. */
function FicheMedicament({ medicament, ouverte, onBasculer }) {
  if (!medicament) return null
  const lignes = [
    ['Posologie adulte', medicament.posologie],
    ['Dose maximale', medicament.dose_max],
    ['Adaptation rénale', medicament.adaptation_renale],
    ['Surveillance', medicament.surveillance],
    ['Contre-indications', medicament.contre_indications],
    ['Grossesse', medicament.grossesse],
    ['Disponibilité au Gabon', medicament.disponibilite],
    ['Remarques', medicament.remarques],
  ].filter(([, v]) => v)

  return (
    <div className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/50">
      <button
        onClick={onBasculer}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[11.5px] text-ardoise"
      >
        <BookOpen className="h-[12px] w-[12px] text-sarcelle" />
        <span className="font-medium">{medicament.dci}</span>
        <span className="truncate text-encre/55">{medicament.classe}</span>
        <ChevronDown
          className={`ml-auto h-[13px] w-[13px] text-encre/40 transition ${ouverte ? 'rotate-180' : ''}`}
        />
      </button>
      {ouverte && (
        <dl className="space-y-1 border-t border-sarcelle-100 px-2.5 py-2 text-[11.5px]">
          {lignes.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2">
              <dt className="text-encre/50">{k}</dt>
              <dd
                className={
                  k === 'Contre-indications' ? 'text-alerte' : 'text-encre/75'
                }
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export default function EtapePrescriptions({
  consultation, setConsultation, patient, medecin, grilles, motifs, params = [],
  onValider, onRetour,
}) {
  const [blocs, setBlocs] = useState([])
  const [etats, setEtats] = useState({}) // id examen → { coche, resultat, unite }
  const [libres, setLibres] = useState([])
  const [protocoles, setProtocoles] = useState([])
  const [lignes, setLignes] = useState([])
  const [noteOrdonnance, setNoteOrdonnance] = useState('')
  const [filtre, setFiltre] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [pret, setPret] = useState(false)
  const [refExamens, setRefExamens] = useState([])
  const [refMeds, setRefMeds] = useState([])
  const [ordoTypes, setOrdoTypes] = useState([])
  const [ficheOuverte, setFicheOuverte] = useState(null)
  const [conseils, setConseils] = useState(null)
  const [detailConseils, setDetailConseils] = useState(false)
  const [catalogue, setCatalogue] = useState(false)
  const [rechercheOrdo, setRechercheOrdo] = useState('')
  const [suiviAjoute, setSuiviAjoute] = useState('')

  /* ============================================ chargement et reprise
     Tout ce qui a déjà été enregistré pour cette consultation est
     rechargé : revenir en arrière depuis le compte rendu ne fait
     perdre aucune saisie. */
  useEffect(() => {
    let vivant = true
    ;(async () => {
      const [b, dejaExamens, dejaOrdo, dejaProtos] = await Promise.all([
        chargerBilans(grilles, motifs).catch(() => []),
        supabase
          .from('examens_demandes')
          .select('libelle, resultat, unite, urgent, type, statut')
          .eq('consultation_id', consultation.id),
        supabase
          .from('ordonnances')
          .select('note, lignes:ordonnance_lignes(*)')
          .eq('consultation_id', consultation.id)
          .maybeSingle(),
        (async () => {
          const ids = grilles.filter((g) => motifs.includes(g.code)).map((g) => g.id)
          if (!ids.length) return { data: [] }
          return supabase
            .from('protocoles')
            .select('id, nom, indication, lignes:protocoles_lignes(*)')
            .in('grille_id', ids)
            .eq('actif', true)
        })(),
      ])
      if (!vivant) return

      setBlocs(b)
      setProtocoles(dejaProtos.data ?? [])

      // Référentiels du médecin : unités, valeurs de référence, thérapeutique
      chargerExamensRef().then((x) => vivant && setRefExamens(x))
      chargerMedicamentsRef().then((x) => vivant && setRefMeds(x))
      chargerOrdonnancesTypes().then((x) => vivant && setOrdoTypes(x))

      // Aucun examen n'est coché d'office : c'est le médecin qui retient.
      const init = {}
      const parLibelle = {}
      ;(dejaExamens.data ?? []).forEach((e) => (parLibelle[e.libelle] = e))

      b.forEach((bloc) =>
        bloc.examens.forEach((e) => {
          const ancien = parLibelle[e.libelle]
          init[e.id] = {
            coche: ancien ? ancien.prescrit !== false : false,
            resultat: ancien?.resultat ?? '',
            unite: ancien?.unite ?? e.unite ?? '',
            urgent: ancien?.urgent ?? false,
          }
          if (ancien) delete parLibelle[e.libelle]
        })
      )
      setEtats(init)

      // Examens saisis à la main lors d'un passage précédent
      setLibres(
        Object.values(parLibelle).map((e) => ({
          libelle: e.libelle,
          type: e.type ?? 'Laboratoire',
          resultat: e.resultat ?? '',
          unite: e.unite ?? '',
          urgent: e.urgent ?? false,
        }))
      )

      if (dejaOrdo.data) {
        setNoteOrdonnance(dejaOrdo.data.note ?? '')
        setLignes(
          [...(dejaOrdo.data.lignes ?? [])]
            .sort((x, y) => (x.ordre ?? 0) - (y.ordre ?? 0))
            .map((l) => ({
              medicament: [l.medicament, l.dosage].filter(Boolean).join(' '),
              posologie: l.posologie ?? '',
              duree: l.duree ?? '',
              quantite: l.quantite ?? '',
              instructions: l.instructions ?? '',
            }))
        )
      }
      setPret(true)
    })()
    return () => {
      vivant = false
    }
  }, [grilles, JSON.stringify(motifs), consultation.id])

  const majEtat = (id, champ, valeur) =>
    setEtats((e) => ({
      ...e,
      [id]: {
        ...(e[id] ?? {}),
        [champ]: valeur,
        // Saisir ou effacer un résultat reprend la main sur le calcul
        ...(champ === 'resultat' ? { auto: false } : {}),
      },
    }))

  /** Rend la ligne au calcul automatique. */
  const rendreAuCalcul = (id) =>
    setEtats((e) => ({ ...e, [id]: { ...(e[id] ?? {}), resultat: '', auto: true } }))

  /* ------------------------------------------------- calculs automatiques */
  const valeursMesurees = useMemo(() => {
    const v = {}
    params.forEach((p) => {
      if (String(p.valeur ?? '').trim()) v[p.libelle] = p.valeur
    })
    blocs.forEach((b) =>
      b.examens.forEach((e) => {
        const r = etats[e.id]?.resultat
        if (String(r ?? '').trim()) v[e.libelle] = r
      })
    )
    libres.forEach((l) => {
      if (l.libelle.trim() && String(l.resultat ?? '').trim()) v[l.libelle.trim()] = l.resultat
    })
    return v
  }, [params, blocs, etats, libres])

  const contextePatient = useMemo(
    () => ({ age: patient?.date_naissance ? age(patient.date_naissance) : null, sexe: patient?.sexe }),
    [patient]
  )
  const unitesSaisies = useMemo(() => {
    const u = {}
    blocs.forEach((b) =>
      b.examens.forEach((e) => {
        const s = etats[e.id]
        if (s?.unite) u[e.libelle] = s.unite
      })
    )
    libres.forEach((l) => {
      if (l.libelle.trim() && l.unite) u[l.libelle.trim()] = l.unite
    })
    return u
  }, [blocs, etats, libres])

  const calculs = useMemo(
    () => calculerTout(valeursMesurees, contextePatient, unitesSaisies),
    [valeursMesurees, contextePatient, unitesSaisies]
  )
  // On ne signale un manque que s'il ne reste qu'une valeur à saisir :
  // au-delà, l'information encombre plus qu'elle n'aide.
  const proches = useMemo(
    () => calculsIncomplets(valeursMesurees, contextePatient).filter((c) => c.manquants.length === 1),
    [valeursMesurees, contextePatient]
  )

  /* Les lignes d'examen que l'application sait calculer se remplissent
     seules — DFG, LDL, non-HDL, rapport CT/HDL. Le médecin garde la main :
     dès qu'il saisit une valeur, la sienne l'emporte et le report cesse. */
  useEffect(() => {
    if (!pret || !calculs.length) return
    const parCode = Object.fromEntries(calculs.map((c) => [c.code, c]))

    setEtats((precedent) => {
      let change = false
      const suivant = { ...precedent }

      blocs.forEach((b) =>
        b.examens.forEach((e) => {
          const c = calculPourExamen(e.libelle)
          if (!c) return
          const resultat = parCode[c.code]
          if (!resultat || resultat.valeur === null) return

          const s = suivant[e.id] ?? {}
          const vide = String(s.resultat ?? '').trim() === ''
          if (!vide && !s.auto) return // valeur saisie à la main : on n'y touche pas

          const texte = String(resultat.valeur)
          if (s.resultat === texte && s.unite === (c.unite || s.unite)) return

          suivant[e.id] = { ...s, resultat: texte, unite: c.unite || s.unite, auto: true }
          change = true
        })
      )
      return change ? suivant : precedent
    })
  }, [calculs, blocs, pret])

  /* ---------------------------------------------------------- ordonnance */
  const appliquerProtocole = (p) =>
    setLignes((l) => [
      ...l,
      ...(p.lignes ?? [])
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map((x) => ({
          medicament: [x.medicament, x.dosage].filter(Boolean).join(' '),
          posologie: x.posologie ?? '',
          duree: x.duree ?? '',
          quantite: x.quantite ?? '',
          instructions: x.instructions ?? '',
        })),
    ])

  /** Ordonnance type du référentiel : lignes, conseils et suivi biologique. */
  const appliquerOrdonnanceType = (o) => {
    setDetailConseils(false)
    setLignes((l) => [
      ...l,
      ...o.lignes.map((x) => ({
        medicament: x.prescription ?? '',
        posologie: x.posologie ?? '',
        duree: x.duree ?? '',
        quantite: '',
        instructions: x.consigne ?? '',
      })),
    ])
    setConseils(o)
  }

  /**
   * Les examens de surveillance d'une ordonnance type rejoignent le bilan.
   * Quand l'examen figure déjà dans un bilan affiché, on coche sa ligne
   * plutôt que d'en créer une seconde : prescrire deux fois la même TSH
   * la ferait payer deux fois au patient.
   */
  const ajouterSuivi = (o) => {
    const normaliser = (s) =>
      (s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')

    const coches = []
    const ajoutes = []
    const dejaLa = []

    setEtats((precedent) => {
      const suivant = { ...precedent }
      ;(o.suivi ?? []).forEach((s) => {
        const n = normaliser(s.examen)
        blocs.forEach((b) =>
          b.examens.forEach((e) => {
            if (e.doublon) return
            if (normaliser(e.libelle) !== n && e.ref_code !== s.code_examen) return
            if (suivant[e.id]?.coche) {
              dejaLa.push(e.libelle)
            } else {
              suivant[e.id] = { ...(suivant[e.id] ?? {}), coche: true }
              coches.push(e.libelle)
            }
          })
        )
      })
      return suivant
    })

    setLibres((x) => {
      const connus = new Set([
        ...x.map((y) => normaliser(y.libelle)),
        ...blocs.flatMap((b) => b.examens.map((e) => normaliser(e.libelle))),
      ])
      const nouveaux = (o.suivi ?? [])
        .filter((s) => !connus.has(normaliser(s.examen)))
        .map((s) => {
          const ref = trouverExamen(refExamens, { code: s.code_examen, libelle: s.examen })
          ajoutes.push(s.examen)
          return {
            libelle: s.examen,
            type: 'Laboratoire',
            resultat: '',
            unite: ref?.type_resultat === 'qualitatif' ? '' : uniteProposee(ref),
            urgent: false,
          }
        })
      return nouveaux.length ? [...x, ...nouveaux] : x
    })

    // Le bloc des examens se trouve plus haut : sans retour explicite,
    // le médecin ne verrait rien se passer.
    const parties = []
    if (coches.length) parties.push(`${coches.join(', ')} coché${coches.length > 1 ? 's' : ''} dans le bilan`)
    if (ajoutes.length) parties.push(`${ajoutes.join(', ')} ajouté${ajoutes.length > 1 ? 's' : ''}`)
    if (!parties.length && dejaLa.length) parties.push(`${dejaLa.join(', ')} déjà au bilan`)
    setSuiviAjoute(parties.join(' · ') || 'Aucun examen de suivi à ajouter.')
    setTimeout(() => setSuiviAjoute(''), 6000)
  }

  const majLigne = (i, champ) => (valeur) =>
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))

  /* ------------------------------------------------------------ synthèse */
  const retenus = useMemo(() => {
    const liste = []
    blocs.forEach((b) =>
      b.examens.forEach((e) => {
        const s = etats[e.id]
        if (!s) return
        const aResultat = String(s.resultat ?? '').trim() !== ''
        if (!s.coche && !aResultat) return
        liste.push({
          libelle: e.libelle,
          code: e.code,
          type: e.type,
          unite: s.unite || e.unite || null,
          resultat: aResultat ? s.resultat.trim() : null,
          // La case cochée signe la prescription, indépendamment du
          // résultat : un examen prescrit ce jour peut être rapporté
          // dans la foulée par un patient qui l'a déjà fait.
          prescrit: !!s.coche,
          urgent: !!s.urgent,
        })
      })
    )
    libres
      .filter((l) => l.libelle.trim())
      .forEach((l) =>
        liste.push({
          libelle: l.libelle.trim(),
          code: null,
          type: l.type,
          unite: l.unite?.trim() || null,
          resultat: String(l.resultat ?? '').trim() || null,
          prescrit: true, // ajouté à la main : c'est une prescription
          urgent: !!l.urgent,
        })
      )
    return liste
  }, [blocs, etats, libres])

  /* Les ordonnances types du référentiel sont classées par pertinence :
     les motifs de la consultation d'abord, le reste à la recherche. */
  const MOTS_MOTIF = {
    thyroide: ['thyro', 'basedow'],
    diabete: ['diabèt', 'diabet', 'metformine', 'insulin', 'dyslipid', 'goutte', 'néphroprotection'],
    hypophyse: ['prolactin', 'hypophys', 'acromégal', 'insipide'],
    surrenales: ['surrénal', 'cushing', 'aldostéron'],
    parathyroides: ['parathyro', 'vitamine d', 'ostéoporose', 'calc'],
    gonades: ['sopk', 'hypogonad', 'androgén', 'ménopaus'],
    obesite: ['obésité', 'obesite'],
    croissance: ['croissance', 'puberté'],
  }

  const ordonnancesPertinentes = useMemo(() => {
    const mots = motifs.flatMap((m) => MOTS_MOTIF[m] ?? [])
    if (!mots.length) return []
    return ordoTypes.filter((o) => {
      const texte = `${o.nom} ${o.indication ?? ''}`.toLowerCase()
      return mots.some((w) => texte.includes(w))
    })
  }, [ordoTypes, motifs])

  const ordonnancesVisibles = useMemo(() => {
    const q = rechercheOrdo.trim().toLowerCase()
    if (q) {
      return ordoTypes.filter((o) =>
        `${o.nom} ${o.indication ?? ''}`.toLowerCase().includes(q)
      )
    }
    const autres = ordoTypes.filter((o) => !ordonnancesPertinentes.includes(o))
    return [...ordonnancesPertinentes, ...autres]
  }, [ordoTypes, ordonnancesPertinentes, rechercheOrdo])

  const medicaments = lignes.filter((l) => l.medicament.trim())
  const avecResultat = retenus.filter((e) => e.resultat).length

  /* --------------------------------------------------------- validation */
  const valider = async () => {
    if (!String(consultation.diagnostic ?? '').trim()) {
      setErreur('Le diagnostic est nécessaire pour générer le compte rendu.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setEnvoi(true)
    setErreur('')

    // Les examens de cette consultation sont réécrits en bloc
    await supabase.from('examens_demandes').delete().eq('consultation_id', consultation.id)
    if (retenus.length) {
      const { error } = await supabase.from('examens_demandes').insert(
        retenus.map((e) => ({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          type: e.type ?? 'Laboratoire',
          libelle: e.libelle,
          code: e.code,
          unite: e.unite,
          urgent: e.urgent,
          prescrit: e.prescrit,
          resultat: e.resultat,
          statut: e.resultat ? 'Résultat disponible' : 'Demandé',
          date_resultat: e.resultat ? new Date().toISOString() : null,
        }))
      )
      if (error) {
        setErreur(`Les examens n’ont pas pu être enregistrés : ${error.message}`)
        setEnvoi(false)
        return
      }
    }

    await supabase.from('ordonnances').delete().eq('consultation_id', consultation.id)
    if (medicaments.length) {
      const { data, error } = await supabase
        .from('ordonnances')
        .insert({
          patient_id: patient.id,
          consultation_id: consultation.id,
          medecin_id: medecin?.id ?? null,
          note: noteOrdonnance.trim() || null,
        })
        .select('id')
        .single()
      if (error) {
        setErreur(`L’ordonnance n’a pas pu être enregistrée : ${error.message}`)
        setEnvoi(false)
        return
      }
      await supabase.from('ordonnance_lignes').insert(
        medicaments.map((l, i) => ({
          ordonnance_id: data.id,
          medicament: l.medicament.trim(),
          posologie: l.posologie.trim() || null,
          duree: l.duree.trim() || null,
          quantite: l.quantite.trim() || null,
          instructions: l.instructions.trim() || null,
          ordre: i,
        }))
      )
      medicaments.forEach((l) => memoriserSaisie('medicament', l.medicament.trim()))
    }

    setEnvoi(false)
    onValider()
  }

  const correspond = (libelle) =>
    !filtre.trim() || libelle.toLowerCase().includes(filtre.trim().toLowerCase())

  return (
    <div className="space-y-3">
      {erreur && <Alerte>{erreur}</Alerte>}

      {/* ================================================ 1. examen clinique */}
      <Carte titre="Examen clinique">
        <div className="space-y-3 p-4">
          <label className="block">
            <span className="etiquette mb-1">Plaintes</span>
            <ZoneAssistee
              className="champ fin resize-y border-panneau-cyanb bg-panneau-cyan/30 leading-relaxed"
              rows={2}
              valeur={consultation.plaintes ?? ''}
              onChange={(v) => setConsultation((c) => ({ ...c, plaintes: v }))}
              placeholder="Ce que le patient exprime, dans ses mots, avant l’examen"
            />
          </label>
          <label className="block">
            <span className="etiquette mb-1">Inspection et examen physique</span>
            <ZoneAssistee
              rows={4}
              valeur={consultation.examen_clinique ?? ''}
              onChange={(v) => setConsultation((c) => ({ ...c, examen_clinique: v }))}
              placeholder="« ecn » puis espace déplie une phrase type"
            />
          </label>
        </div>
      </Carte>

      {/* ========================== 2. examens paracliniques et résultats */}
      <Carte
        titre="Examens paracliniques"
        sous="Cochez pour prescrire, saisissez directement le résultat si le patient l’apporte. Rien n’est coché d’avance."
        action={
          <div className="flex items-center gap-2">
            <span className="tabular text-[11.5px] text-encre/55">
              <FlaskConical className="mr-1 inline h-[13px] w-[13px]" />
              {retenus.length} retenu{retenus.length > 1 ? 's' : ''}
              {avecResultat > 0 && ` · ${avecResultat} avec résultat`}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-encre/35" />
              <input
                className="champ w-40 py-[3px] pl-7"
                placeholder="Filtrer"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
              />
            </div>
          </div>
        }
      >
        <div className="space-y-3 p-4">
          {!pret && (
            <p className="flex items-center gap-2 py-4 text-[12.5px] text-encre/55">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des bilans…
            </p>
          )}

          {blocs.map((b) => {
            const visibles = b.examens.filter((e) => correspond(e.libelle))
            if (!visibles.length) return null
            return (
              <div key={b.id}>
                <p className="etiquette mb-1.5 flex flex-wrap items-center gap-2">
                  {b.titre}
                  <span className="font-normal normal-case tracking-normal text-encre/45">
                    {b.grille?.nom}
                  </span>
                  {b.a_valider && (
                    <span className="puce bg-panneau-jaune text-[#75651a]">proposition à valider</span>
                  )}
                </p>
                <ul className="divide-y divide-sarcelle-100 rounded-xs border border-sarcelle-100">
                  {visibles.map((e) => {
                    const s = etats[e.id] ?? {}
                    const aResultat = String(s.resultat ?? '').trim() !== ''
                    return (
                      <li
                        key={e.id}
                        className={`flex flex-wrap items-center gap-2 px-2.5 py-[6px] ${
                          e.doublon ? 'bg-black/[.02]' : aResultat ? 'bg-panneau-vert/30' : ''
                        }`}
                      >
                        <label className="flex min-w-[190px] flex-1 cursor-pointer items-center gap-2 text-[12.5px]">
                          <input
                            type="checkbox"
                            className="h-[15px] w-[15px] rounded-xs accent-[#0E7C86]"
                            checked={!!s.coche}
                            disabled={e.doublon}
                            onChange={(ev) => majEtat(e.id, 'coche', ev.target.checked)}
                          />
                          <span className={e.doublon ? 'text-encre/45 line-through' : ''}>
                            {e.libelle}
                          </span>
                          {e.type === 'Imagerie' && (
                            <span className="puce bg-sarcelle-100 text-sarcelle-600">imagerie</span>
                          )}
                        </label>

                        {!e.doublon && e.type_resultat === 'qualitatif' && (
                          // Un ECBU, une échographie, un caryotype rendent un
                          // texte : ni champ numérique, ni unité, ni norme.
                          <input
                            className="champ min-w-[200px] flex-[2] py-[3px]"
                            placeholder={
                              e.type === 'Imagerie' ? 'Compte rendu, conclusion' : 'Résultat'
                            }
                            value={s.resultat ?? ''}
                            onChange={(ev) => majEtat(e.id, 'resultat', ev.target.value)}
                          />
                        )}

                        {!e.doublon && e.type_resultat !== 'qualitatif' && (
                          <>
                            <input
                              className="champ w-28 py-[3px] text-right"
                              inputMode="decimal"
                              placeholder="Résultat"
                              value={s.resultat ?? ''}
                              onChange={(ev) => majEtat(e.id, 'resultat', ev.target.value)}
                            />
                            <input
                              className="champ w-24 py-[3px] font-mono text-[11px]"
                              placeholder="unité"
                              value={s.unite ?? ''}
                              onChange={(ev) => majEtat(e.id, 'unite', ev.target.value)}
                            />
                            {calculPourExamen(e.libelle) ? (
                              s.auto ? (
                                <span
                                  className="puce w-[74px] shrink-0 justify-center bg-sarcelle-100 text-sarcelle-600"
                                  title={calculPourExamen(e.libelle).formule}
                                >
                                  calculé
                                </span>
                              ) : (
                                <button
                                  onClick={() => rendreAuCalcul(e.id)}
                                  className="w-[74px] shrink-0 text-[11px] text-sarcelle-600 underline underline-offset-2"
                                  title="Revenir à la valeur calculée par l’application"
                                >
                                  recalculer
                                </button>
                              )
                            ) : (
                              <Situation
                                valeur={s.resultat}
                                unite={s.unite}
                                ref_={trouverExamen(refExamens, { code: e.ref_code, libelle: e.libelle })}
                              />
                            )}
                          </>
                        )}

                        {e.doublon && (
                          <span className="flex items-center gap-1 text-[11px] text-sarcelle-600">
                            <Link2 className="h-[11px] w-[11px]" /> déjà dans {e.dejaDans}
                          </span>
                        )}
                        {e.conditionnel && !e.doublon && (
                          <span className="flex w-full items-center gap-1 text-[11px] italic text-encre/55 sm:w-auto">
                            <Info className="h-[11px] w-[11px] shrink-0" /> {e.condition}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          {/* examens hors bilan */}
          {libres.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <ChampSuggere
                  domaine="examen"
                  valeur={l.libelle}
                  memoriser={false}
                  onChange={(v) =>
                    setLibres((x) =>
                      x.map((y, j) => {
                        if (j !== i) return y
                        // L'unité du référentiel s'applique d'elle-même
                        const ref = trouverExamen(refExamens, { libelle: v })
                        const qualitatif = ref?.type_resultat === 'qualitatif'
                        return {
                          ...y,
                          libelle: v,
                          unite: qualitatif ? '' : ref ? uniteProposee(ref) : y.unite,
                        }
                      })
                    )
                  }
                  placeholder="Autre examen — 186 examens au référentiel"
                />
              </div>
              {trouverExamen(refExamens, { libelle: l.libelle })?.type_resultat === 'qualitatif' ||
              l.type === 'Imagerie' ? (
                <input
                  className="champ min-w-[200px] flex-[2]"
                  placeholder="Résultat"
                  value={l.resultat}
                  onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, resultat: e.target.value } : y)))}
                />
              ) : (
                <>
                  <input
                    className="champ w-28 text-right"
                    placeholder="Résultat"
                    value={l.resultat}
                    onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, resultat: e.target.value } : y)))}
                  />
                  <input
                    className="champ w-24 font-mono text-[11px]"
                    placeholder="unité"
                    value={l.unite}
                    onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, unite: e.target.value } : y)))}
                  />
                  <Situation
                    valeur={l.resultat}
                    unite={l.unite}
                    ref_={trouverExamen(refExamens, { libelle: l.libelle })}
                  />
                </>
              )}
              <Choix
                vide={null}
                options={['Laboratoire', 'Imagerie']}
                value={l.type}
                onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, type: e.target.value } : y)))}
                className="w-32"
              />
              <Case
                label="Urgent"
                checked={l.urgent}
                onChange={(e) => setLibres((x) => x.map((y, j) => (j === i ? { ...y, urgent: e.target.checked } : y)))}
              />
              <button onClick={() => setLibres((x) => x.filter((_, j) => j !== i))}
                className="btn-fantome px-1.5" aria-label="Retirer">
                <Trash2 className="h-[13px] w-[13px]" />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setLibres((l) => [...l, { libelle: '', type: 'Laboratoire', resultat: '', unite: '', urgent: false }])
            }
            className="btn-secondaire"
          >
            <Plus className="h-[14px] w-[14px]" /> Autre examen
          </button>
        </div>

        {/* ------------------------------------------- calculs automatiques */}
        {calculs.length > 0 && (
          <div className="border-t border-sarcelle-100 bg-sarcelle-50/50 px-4 py-3">
            <p className="etiquette mb-2 flex items-center gap-1.5">
              <Calculator className="h-[13px] w-[13px]" /> Valeurs calculées
            </p>

            {calculs.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {calculs.map((c) => (
                  <div key={c.code} className="rounded-xs border border-sarcelle-100 bg-white px-2.5 py-2">
                    <p className="text-[12px] font-medium text-ardoise">{c.nom}</p>
                    {c.valeur !== null ? (
                      <p className="tabular font-mono text-[15px] font-semibold text-sarcelle-600">
                        {c.valeur}
                        {c.unite && <span className="ml-1 text-[11px] font-normal">{c.unite}</span>}
                      </p>
                    ) : (
                      <p className="text-[12px] text-alerte">non calculable</p>
                    )}
                    {c.interpretation && (
                      <p className="text-[11px] text-encre/60">{c.interpretation}</p>
                    )}
                    {c.avertissement && (
                      <p className="text-[11px] text-alerte">{c.avertissement}</p>
                    )}
                    <p className="mt-0.5 text-[10px] italic text-encre/40">{c.formule}</p>
                  </div>
                ))}
              </div>
            )}

            {proches.length > 0 && (
              <p className="mt-2 text-[11.5px] text-encre/55">
                À une valeur près :{' '}
                {proches.map((c) => `${c.abrege} (${c.manquants[0]})`).join(' · ')}
              </p>
            )}
          </div>
        )}
      </Carte>

      {/* ==================================================== 3. diagnostic */}
      <Carte titre="Diagnostic retenu" sous="Saisie libre.">
        <div className="p-4">
          <ZoneAssistee
            rows={4}
            valeur={consultation.diagnostic ?? ''}
            onChange={(v) => setConsultation((c) => ({ ...c, diagnostic: v }))}
            placeholder="Diagnostic retenu, diagnostics différentiels"
          />
        </div>
      </Carte>

      {/* ============================================== 4. conduite à tenir */}
      <Carte titre="Conduite à tenir" sous="Suivi, mesures hygiéno-diététiques, orientation.">
        <div className="p-4">
          <ZoneAssistee
            rows={3}
            valeur={consultation.conduite_a_tenir ?? ''}
            onChange={(v) => setConsultation((c) => ({ ...c, conduite_a_tenir: v }))}
            placeholder="« cat » puis espace déplie une phrase type"
          />
        </div>
      </Carte>

      {/* ==================================================== 5. ordonnance */}
      <Carte
        titre="Ordonnance"
        action={
          <span className="tabular text-[11.5px] text-encre/55">
            <Pill className="mr-1 inline h-[13px] w-[13px]" />
            {medicaments.length} médicament{medicaments.length > 1 ? 's' : ''}
          </span>
        }
      >
        <div className="space-y-2 p-4">
          {/* Les ordonnances types restent repliées : on ne montre pas
              vingt-neuf pastilles à un médecin qui, neuf fois sur dix,
              va simplement taper deux médicaments. */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setLignes((l) => [...l, { ...LIGNE_VIDE }])} className="btn-primaire">
              <Plus className="h-[14px] w-[14px]" /> Ajouter un médicament
            </button>
            <button
              onClick={() => setCatalogue((v) => !v)}
              className="btn-secondaire"
              aria-expanded={catalogue}
            >
              <BookOpen className="h-[14px] w-[14px]" /> Ordonnance type
              <ChevronDown className={`h-[13px] w-[13px] transition ${catalogue ? 'rotate-180' : ''}`} />
            </button>
            {protocoles.map((p) => (
              <button
                key={p.id}
                onClick={() => appliquerProtocole(p)}
                title={p.indication ?? ''}
                className="rounded-full border border-sarcelle-100 bg-white px-2.5 py-[5px] text-[11.5px] text-ardoise transition hover:border-sarcelle-400"
              >
                {p.nom}
              </button>
            ))}
          </div>

          {catalogue && (
            <div className="rounded-xs border border-sarcelle-100 bg-sarcelle-50/50 p-2.5">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-encre/35" />
                <input
                  autoFocus
                  className="champ pl-7"
                  placeholder="Chercher une ordonnance type"
                  value={rechercheOrdo}
                  onChange={(e) => setRechercheOrdo(e.target.value)}
                />
              </div>
              <ul className="max-h-56 divide-y divide-sarcelle-100 overflow-y-auto fin rounded-xs border border-sarcelle-100 bg-white">
                {ordonnancesVisibles.length === 0 ? (
                  <li className="px-3 py-3 text-center text-[12px] text-encre/50">
                    Aucune ordonnance type ne correspond.
                  </li>
                ) : (
                  ordonnancesVisibles.map((o) => (
                    <li key={o.code}>
                      <button
                        onClick={() => {
                          appliquerOrdonnanceType(o)
                          setCatalogue(false)
                          setRechercheOrdo('')
                        }}
                        className="w-full px-3 py-2 text-left transition hover:bg-sarcelle-50"
                      >
                        <span className="block text-[12.5px] font-medium text-ardoise">{o.nom}</span>
                        {o.indication && (
                          <span className="block truncate text-[11px] text-encre/55">{o.indication}</span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {!rechercheOrdo.trim() && ordonnancesPertinentes.length > 0 && (
                <p className="mt-1.5 text-[11px] text-encre/45">
                  Classées selon les motifs de la consultation. Tapez pour chercher dans les{' '}
                  {ordoTypes.length}.
                </p>
              )}
            </div>
          )}

          {conseils && (
            <div className="rounded-xs border border-panneau-jauneb bg-panneau-jaune px-3 py-2 text-[12px] text-[#75651a]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{conseils.nom}</span>
                {conseils.suivi?.length > 0 && (
                  <button onClick={() => ajouterSuivi(conseils)} className="btn-secondaire py-[2px]">
                    <ClipboardList className="h-[12px] w-[12px] shrink-0" />
                    Ajouter le suivi au bilan
                  </button>
                )}
                <button
                  onClick={() => setDetailConseils((v) => !v)}
                  className="text-[11px] underline"
                >
                  {detailConseils ? 'Moins' : 'Détails'}
                </button>
                <button onClick={() => setConseils(null)} className="ml-auto text-[11px] underline">
                  Masquer
                </button>
              </div>
              {suiviAjoute && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#2c6435]">
                  <Check className="h-[13px] w-[13px] shrink-0" /> {suiviAjoute}
                </p>
              )}
              {detailConseils && (
                <div className="mt-1.5 space-y-1 border-t border-panneau-jauneb pt-1.5">
                  {conseils.indication && <p>Indication : {conseils.indication}</p>}
                  {conseils.conseils && <p>{conseils.conseils}</p>}
                  {conseils.suivi?.length > 0 && (
                    <p>Suivi : {conseils.suivi.map((s) => `${s.examen} (${s.periodicite ?? '—'})`).join(' · ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {lignes.map((l, i) => (
            <div key={i} className="rounded-xs border border-sarcelle-100 p-2.5">
              <div className="flex items-start gap-2">
                <span className="tabular mt-[7px] w-4 shrink-0 font-mono text-[12px] text-encre/40">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <ChampSuggere
                    domaine="medicament"
                    valeur={l.medicament}
                    memoriser={false}
                    onChange={majLigne(i, 'medicament')}
                    placeholder="Médicament et dosage — ex. Metformine 850 mg"
                  />
                  <FicheMedicament
                    medicament={trouverMedicament(refMeds, l.medicament)}
                    ouverte={ficheOuverte === i}
                    onBasculer={() => setFicheOuverte(ficheOuverte === i ? null : i)}
                  />
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <input className="champ" value={l.posologie}
                      onChange={(e) => majLigne(i, 'posologie')(e.target.value)}
                      placeholder="Posologie" />
                    <input className="champ" value={l.duree}
                      onChange={(e) => majLigne(i, 'duree')(e.target.value)}
                      placeholder="Durée" />
                    <input className="champ" value={l.quantite}
                      onChange={(e) => majLigne(i, 'quantite')(e.target.value)}
                      placeholder="Quantité" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {POSOLOGIES.map((p) => (
                      <button key={p} onClick={() => majLigne(i, 'posologie')(p)}
                        className="rounded-full border border-sarcelle-100 bg-white px-2 py-[2px] text-[11px] text-encre/70 transition hover:border-sarcelle-400 hover:text-ardoise">
                        {p}
                      </button>
                    ))}
                    <input className="champ ml-auto min-w-[140px] flex-1 py-[3px] text-[12px]"
                      value={l.instructions}
                      onChange={(e) => majLigne(i, 'instructions')(e.target.value)}
                      placeholder="Instructions (au repas, le soir…)" />
                  </div>
                </div>
                <button onClick={() => setLignes((x) => x.filter((_, j) => j !== i))}
                  className="mt-[7px] shrink-0 text-encre/25 transition hover:text-alerte"
                  aria-label="Retirer le médicament">
                  <Trash2 className="h-[13px] w-[13px]" />
                </button>
              </div>
            </div>
          ))}

          {lignes.length > 0 && (
            <input className="champ"
              placeholder="Note au pharmacien (facultatif)"
              value={noteOrdonnance} onChange={(e) => setNoteOrdonnance(e.target.value)} />
          )}
        </div>
      </Carte>

      <div className="flex items-center justify-between gap-2">
        <button onClick={onRetour} className="btn-secondaire">
          <ArrowLeft className="h-[14px] w-[14px]" /> Interrogatoire
        </button>
        <button onClick={valider} disabled={envoi} className="btn-primaire">
          {envoi ? 'Enregistrement…' : 'Générer le compte rendu'}
          <ArrowRight className="h-[14px] w-[14px]" />
        </button>
      </div>
    </div>
  )
}
