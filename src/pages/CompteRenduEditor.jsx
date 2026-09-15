import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Save, Printer, CheckCircle2, Wand2, ArrowLeft, Signature } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { age, dateFr, jourLong, initiales } from '../lib/format'
import { CATALOGUE_VARIABLES, composerCompteRendu, construireContexte, fusionner } from '../lib/templates'
import { Carte, Chargement, Alerte, Champ, Choix, Puce } from '../components/ui'

const CATEGORIES = ['Consultation', 'Imagerie', 'Biologie', 'Opératoire', 'Certificat', 'Courrier']

export default function CompteRenduEditor() {
  const { id } = useParams()
  const [recherche] = useSearchParams()
  const navigate = useNavigate()
  const { medecin } = useAuth()
  const zoneRef = useRef(null)

  const creation = !id
  const idConsultation = recherche.get('consultation')
  const idPatient = recherche.get('patient')

  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const [cr, setCr] = useState({
    titre: 'Compte rendu de consultation',
    categorie: 'Consultation',
    contenu: '',
    statut: 'Brouillon',
    modele_id: '',
  })
  const [patient, setPatient] = useState(null)
  const [consultation, setConsultation] = useState(null)
  const [parametres, setParametres] = useState([])
  const [modeles, setModeles] = useState([])

  /* ------------------------------------------------------------ chargement */
  useEffect(() => {
    ;(async () => {
      const { data: mods } = await supabase
        .from('modeles_compte_rendu')
        .select('*')
        .eq('actif', true)
        .order('nom')
      setModeles(mods ?? [])

      if (creation) {
        let cs = null
        let pat = null
        if (idConsultation) {
          const { data } = await supabase
            .from('consultations')
            .select('*, patient:patients(*)')
            .eq('id', idConsultation)
            .maybeSingle()
          if (data) {
            pat = data.patient
            const { patient: _p, ...reste } = data
            cs = reste
            const { data: prm } = await supabase
              .from('consultation_parametres')
              .select('*')
              .eq('consultation_id', idConsultation)
              .order('ordre')
            setParametres(prm ?? [])
          }
        } else if (idPatient) {
          const { data } = await supabase.from('patients').select('*').eq('id', idPatient).maybeSingle()
          pat = data
        }
        if (!pat) setErreur("Impossible d'identifier le patient de ce compte rendu.")
        setPatient(pat)
        setConsultation(cs)
        setChargement(false)
        return
      }

      const { data, error } = await supabase
        .from('comptes_rendus')
        .select('*, patient:patients(*), consultation:consultations(*)')
        .eq('id', id)
        .maybeSingle()
      if (error || !data) {
        setErreur('Compte rendu introuvable.')
        setChargement(false)
        return
      }
      setPatient(data.patient)
      setConsultation(data.consultation)
      setCr({
        titre: data.titre ?? '',
        categorie: data.categorie ?? 'Consultation',
        contenu: data.contenu ?? '',
        statut: data.statut ?? 'Brouillon',
        modele_id: data.modele_id ?? '',
        numero: data.numero,
        date_cr: data.date_cr,
      })
      if (data.consultation?.id) {
        const { data: prm } = await supabase
          .from('consultation_parametres')
          .select('*')
          .eq('consultation_id', data.consultation.id)
          .order('ordre')
        setParametres(prm ?? [])
      }
      setChargement(false)
    })()
  }, [id, creation, idConsultation, idPatient])

  const contexte = useCallback(
    () => construireContexte({ patient, consultation, parametres, medecin, compteRendu: cr }),
    [patient, consultation, parametres, medecin, cr]
  )

  /* ------------------------------------------------------- appliquer modèle */
  const appliquerModele = (idModele) => {
    const m = modeles.find((x) => x.id === idModele)
    setCr((c) => ({ ...c, modele_id: idModele }))
    if (!m) return
    const texte = composerCompteRendu(m, contexte())
    setCr((c) => ({ ...c, modele_id: idModele, titre: m.nom, categorie: m.categorie ?? c.categorie, contenu: texte }))
  }

  /** Résout les variables restées dans le texte (après édition manuelle). */
  const resoudreVariables = () => setCr((c) => ({ ...c, contenu: fusionner(c.contenu, contexte()) }))

  const insererVariable = (cle) => {
    const zone = zoneRef.current
    const jeton = `{{${cle}}}`
    if (!zone) {
      setCr((c) => ({ ...c, contenu: c.contenu + jeton }))
      return
    }
    const { selectionStart: a, selectionEnd: b, value } = zone
    const nouveau = value.slice(0, a) + jeton + value.slice(b)
    setCr((c) => ({ ...c, contenu: nouveau }))
    requestAnimationFrame(() => {
      zone.focus()
      zone.setSelectionRange(a + jeton.length, a + jeton.length)
    })
  }

  /* --------------------------------------------------------- enregistrement */
  const enregistrer = async (champsSupplementaires = {}) => {
    if (!patient) return
    setEnvoi(true)
    setErreur('')
    const charge = {
      titre: cr.titre?.trim() || 'Compte rendu',
      categorie: cr.categorie,
      contenu: cr.contenu,
      statut: champsSupplementaires.statut ?? cr.statut,
      modele_id: cr.modele_id || null,
      patient_id: patient.id,
      consultation_id: consultation?.id ?? null,
      medecin_id: medecin?.id ?? null,
      ...(champsSupplementaires.statut === 'Signé' ? { date_signature: new Date().toISOString() } : {}),
    }

    if (creation) {
      const { data, error } = await supabase.from('comptes_rendus').insert(charge).select('id').single()
      setEnvoi(false)
      if (error) {
        setErreur(`Enregistrement impossible : ${error.message}`)
        return
      }
      navigate(`/comptes-rendus/${data.id}`, { replace: true })
      return
    }

    const { error } = await supabase.from('comptes_rendus').update(charge).eq('id', id)
    setEnvoi(false)
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      return
    }
    if (champsSupplementaires.statut) setCr((c) => ({ ...c, statut: champsSupplementaires.statut }))
    setMessage('Compte rendu enregistré.')
    setTimeout(() => setMessage(''), 2600)
  }

  if (chargement) return <Chargement texte="Chargement du compte rendu…" />
  if (!patient)
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alerte>{erreur || 'Compte rendu introuvable.'}</Alerte>
        <Link to="/comptes-rendus" className="btn-secondaire mt-4">
          Retour aux comptes rendus
        </Link>
      </div>
    )

  return (
    <div className="px-3 py-6 lg:px-6">
      {/* -------------------------------------------------------------- entête */}
      <div className="sans-impression mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link to="/comptes-rendus" className="btn-fantome -ml-2 mb-1 text-[12px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Comptes rendus
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold tracking-tight text-ardoise">
            {creation ? 'Nouveau compte rendu' : cr.titre}
            {!creation && <Puce>{cr.statut}</Puce>}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-encre/55">
            <Link to={`/patients/${patient.id}`} className="font-medium text-sarcelle hover:underline">
              {patient.nom} {patient.prenom}
            </Link>
            <span className="font-mono text-[11px]">{patient.code}</span>
            {patient.date_naissance && <span>{age(patient.date_naissance)} ans</span>}
            {consultation && (
              <Link to={`/consultations/${consultation.id}`} className="hover:underline">
                consultation {consultation.numero} du {dateFr(consultation.date_consultation)}
              </Link>
            )}
            {cr.numero && <span className="font-mono text-[11px]">{cr.numero}</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {message && <span className="text-[12px] font-medium text-[#2c6435]">{message}</span>}
          {!creation && (
            <>
              <button onClick={() => imprimer({ cr, patient, medecin })} className="btn-secondaire">
                <Printer className="h-[14px] w-[14px]" /> Imprimer
              </button>
              {cr.statut === 'Brouillon' && (
                <button onClick={() => enregistrer({ statut: 'Validé' })} disabled={envoi} className="btn-secondaire">
                  <CheckCircle2 className="h-[14px] w-[14px]" /> Valider
                </button>
              )}
              {cr.statut === 'Validé' && (
                <button onClick={() => enregistrer({ statut: 'Signé' })} disabled={envoi} className="btn-secondaire">
                  <Signature className="h-[14px] w-[14px]" /> Signer
                </button>
              )}
            </>
          )}
          <button onClick={() => enregistrer()} disabled={envoi} className="btn-primaire">
            <Save className="h-[14px] w-[14px]" /> {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {erreur && (
        <div className="mb-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* ------------------------------------------------------- rédaction */}
        <div className="space-y-3">
          <Carte>
            <div className="grid gap-3 border-b border-sarcelle-100 p-4 sm:grid-cols-3">
              <Choix
                label="Modèle"
                className="sm:col-span-1"
                vide="Rédaction libre"
                options={modeles.map((m) => ({ value: m.id, label: m.nom }))}
                value={cr.modele_id ?? ''}
                onChange={(e) => appliquerModele(e.target.value)}
              />
              <Champ
                label="Titre du document"
                className="sm:col-span-1"
                value={cr.titre}
                onChange={(e) => setCr((c) => ({ ...c, titre: e.target.value }))}
              />
              <Choix
                label="Catégorie"
                vide={null}
                options={CATEGORIES}
                value={cr.categorie}
                onChange={(e) => setCr((c) => ({ ...c, categorie: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-sarcelle-100 bg-sarcelle-50/40 px-4 py-2">
              <p className="text-[11.5px] text-encre/55">
                Les variables <code className="font-mono text-[11px] text-sarcelle-600">{'{{…}}'}</code> sont
                remplacées par les données du dossier.
              </p>
              <button onClick={resoudreVariables} className="btn-secondaire">
                <Wand2 className="h-[14px] w-[14px]" /> Résoudre les variables
              </button>
            </div>

            <textarea
              ref={zoneRef}
              className="fin block min-h-[52vh] w-full resize-y border-0 px-4 py-4 font-mono text-[12.5px] leading-[1.75] outline-none"
              value={cr.contenu}
              onChange={(e) => setCr((c) => ({ ...c, contenu: e.target.value }))}
              placeholder={
                modeles.length
                  ? 'Choisissez un modèle ci-dessus, ou rédigez directement le compte rendu.'
                  : 'Rédigez le compte rendu. Vous pouvez créer des modèles réutilisables dans « Modèles de CR ».'
              }
            />
          </Carte>

          {/* ---------------------------------------------------- aperçu papier */}
          <Carte titre="Aperçu du document" sous="Rendu tel qu'il sera imprimé">
            <div className="bg-brume p-4">
              <div className="mx-auto max-w-[720px] border border-sarcelle-100 bg-white px-9 py-9 shadow-fiche">
                <pre className="whitespace-pre-wrap font-sans text-[12.5px] leading-[1.7] text-encre">
                  {fusionner(cr.contenu, contexte()) || 'Le document est vide.'}
                </pre>
              </div>
            </div>
          </Carte>
        </div>

        {/* --------------------------------------------------------- variables */}
        <aside className="sans-impression space-y-3">
          <Carte titre="Patient" sous="Données reprises dans le document">
            <div className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[12px] font-semibold text-sarcelle-600">
                {initiales(patient)}
              </span>
              <div className="min-w-0 text-[12px] leading-relaxed">
                <p className="truncate font-semibold text-ardoise">
                  {patient.nom} {patient.prenom}
                </p>
                <p className="text-encre/55">
                  {[patient.sexe, patient.date_naissance && `${age(patient.date_naissance)} ans`, patient.organisme_assurance]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          </Carte>

          <Carte titre="Insérer une donnée" sous="Cliquez pour l'ajouter au curseur">
            <div className="max-h-[52vh] space-y-3 overflow-y-auto fin p-3">
              {CATALOGUE_VARIABLES.map((g) => (
                <div key={g.groupe}>
                  <p className="etiquette mb-1.5">{g.groupe}</p>
                  <div className="flex flex-wrap gap-1">
                    {g.variables.map(([cle, libelle]) => (
                      <button
                        key={cle}
                        onClick={() => insererVariable(cle)}
                        title={`{{${cle}}}`}
                        className="rounded-full border border-sarcelle-100 bg-white px-2 py-[3px] text-[11px] text-ardoise transition hover:border-sarcelle-400 hover:bg-sarcelle-50"
                      >
                        {libelle}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Carte>
        </aside>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- impression */

function imprimer({ cr, patient, medecin }) {
  const echapper = (s = '') =>
    String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>${echapper(cr.titre)} — ${echapper(patient?.nom ?? '')}</title>
  <style>
    @page { margin: 20mm 18mm; }
    body { font-family: Georgia, 'Times New Roman', serif; color:#111; font-size:11.5pt; line-height:1.6; }
    header { border-bottom:1.5pt solid #111; padding-bottom:6pt; margin-bottom:16pt; font-size:9.5pt; color:#333; }
    pre { white-space:pre-wrap; font-family:inherit; font-size:11.5pt; margin:0; }
    footer { margin-top:26pt; font-size:9.5pt; color:#555; border-top:.5pt solid #bbb; padding-top:6pt; }
  </style></head><body>
    <header>
      ${echapper(medecin?.etablissement || 'Centre Diagnostic — Libreville')} ·
      ${echapper(cr.numero ?? '')} ·
      Dossier ${echapper(patient?.code ?? '')}
    </header>
    <pre>${echapper(cr.contenu)}</pre>
    <footer>
      Document ${echapper(cr.statut ?? '')} — édité le ${jourLong()} par
      ${echapper(medecin?.civilite || 'Dr')} ${echapper(medecin?.nom || '')} ${echapper(medecin?.prenom || '')}
    </footer>
  </body></html>`

  const w = window.open('', '_blank', 'width=880,height=1000')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}
