import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Pencil,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  ClipboardList,
  Paperclip,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { age, dateFr, dateHeureFr, initiales } from '../lib/format'
import { Carte, Chargement, Vide, Puce, Alerte, Champ, Choix, Zone, Modale } from '../components/ui'

const ONGLETS = [
  { cle: 'consultations', libelle: 'Consultations', icone: Stethoscope },
  { cle: 'comptes_rendus', libelle: 'Comptes rendus', icone: FileText },
  { cle: 'ordonnances', libelle: 'Ordonnances', icone: Pill },
  { cle: 'examens', libelle: 'Examens', icone: FlaskConical },
  { cle: 'antecedents', libelle: 'Antécédents', icone: ClipboardList },
  { cle: 'documents', libelle: 'Documents', icone: Paperclip },
]

export default function PatientDossier() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { medecin } = useAuth()

  const [patient, setPatient] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [onglet, setOnglet] = useState('consultations')
  const [d, setD] = useState({ consultations: [], comptes_rendus: [], ordonnances: [], examens: [], antecedents: [], documents: [] })
  const [modaleAntecedent, setModaleAntecedent] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    ;(async () => {
      const [p, cs, cr, ord, ex, ant, doc] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('consultations')
          .select('id, numero, date_consultation, type_consultation, motif, diagnostic, statut, medecin:medecins(civilite, nom)')
          .eq('patient_id', id)
          .order('date_consultation', { ascending: false }),
        supabase
          .from('comptes_rendus')
          .select('id, numero, titre, categorie, statut, date_cr')
          .eq('patient_id', id)
          .order('date_cr', { ascending: false }),
        supabase
          .from('ordonnances')
          .select('id, numero, date_ordonnance, note, lignes:ordonnance_lignes(medicament, dosage, posologie, duree)')
          .eq('patient_id', id)
          .order('date_ordonnance', { ascending: false }),
        supabase
          .from('examens_demandes')
          .select('*')
          .eq('patient_id', id)
          .order('date_demande', { ascending: false }),
        supabase.from('antecedents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      ])

      if (!p.data) setErreur('Patient introuvable.')
      setPatient(p.data)
      setD({
        consultations: cs.data ?? [],
        comptes_rendus: cr.data ?? [],
        ordonnances: ord.data ?? [],
        examens: ex.data ?? [],
        antecedents: ant.data ?? [],
        documents: doc.data ?? [],
      })
      setChargement(false)
    })()
  }, [id])

  const nouvelleConsultation = async () => {
    const { data, error } = await supabase
      .from('consultations')
      .insert({ patient_id: id, medecin_id: medecin?.id ?? null })
      .select('id')
      .single()
    if (error) {
      setErreur(`Consultation impossible à ouvrir : ${error.message}`)
      return
    }
    navigate(`/consultations/${data.id}`)
  }

  if (chargement) return <Chargement texte="Ouverture du dossier…" />
  if (!patient)
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Alerte>{erreur || 'Patient introuvable.'}</Alerte>
        <Link to="/patients" className="btn-secondaire mt-4">
          Retour au fichier
        </Link>
      </div>
    )

  return (
    <div className="px-3 py-6 lg:px-6">
      {/* ------------------------------------------------------ entête dossier */}
      <div className="rounded-xs border border-sarcelle-100 bg-white shadow-fiche">
        <div className="flex flex-wrap items-start gap-4 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[14px] font-semibold text-sarcelle-600">
            {initiales(patient)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[21px] font-semibold tracking-tight text-ardoise">
              {patient.nom} {patient.prenom}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-encre/60">
              <span className="font-mono">{patient.code}</span>
              {patient.date_naissance && ` · ${dateFr(patient.date_naissance)} (${age(patient.date_naissance)} ans)`}
              {patient.sexe && ` · ${patient.sexe}`}
              {patient.groupe_sanguin && ` · groupe ${patient.groupe_sanguin}`}
              {(patient.telephone || patient.mobile) && ` · ${patient.telephone || patient.mobile}`}
              {patient.ville && ` · ${patient.ville}`}
            </p>
            {patient.organisme_assurance && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-encre/55">
                <Puce ton="Validé">{patient.organisme_assurance}</Puce>
                {patient.numero_secu && <span className="font-mono">n° {patient.numero_secu}</span>}
                {patient.regime_assurance && <span>{patient.regime_assurance}</span>}
                {patient.fonds_cnamgs && <span>fonds {patient.fonds_cnamgs}</span>}
                
                {patient.validite_assurance && <span>valide jusqu’au {dateFr(patient.validite_assurance)}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/patients/${id}/modifier`} className="btn-secondaire">
              <Pencil className="h-[14px] w-[14px]" /> Modifier la fiche
            </Link>
            <button onClick={nouvelleConsultation} className="btn-primaire">
              <Stethoscope className="h-[14px] w-[14px]" /> Nouvelle consultation
            </button>
          </div>
        </div>

        {patient.allergies && (
          <div className="flex items-start gap-2 border-t border-panneau-roseb bg-panneau-rose px-4 py-2 text-[12.5px] text-[#8f2b2b]">
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">Allergies :</strong> {patient.allergies}
            </span>
          </div>
        )}
        {patient.note && (
          <div className="border-t border-panneau-jauneb bg-panneau-jaune px-4 py-2 text-[12.5px] text-[#75651a]">
            <strong className="font-semibold">Note :</strong> {patient.note}
          </div>
        )}
      </div>

      {erreur && (
        <div className="mt-3">
          <Alerte>{erreur}</Alerte>
        </div>
      )}

      {/* ------------------------------------------------------------- onglets */}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-sarcelle-100">
        {ONGLETS.map(({ cle, libelle, icone: Icone }) => {
          const actif = onglet === cle
          const n = d[cle]?.length ?? 0
          return (
            <button
              key={cle}
              onClick={() => setOnglet(cle)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] transition ${
                actif
                  ? 'border-sarcelle font-semibold text-sarcelle-600'
                  : 'border-transparent text-encre/55 hover:text-ardoise'
              }`}
            >
              <Icone className="h-[14px] w-[14px]" />
              {libelle}
              {n > 0 && (
                <span className="tabular rounded-full bg-sarcelle-100 px-1.5 font-mono text-[10px] text-sarcelle-600">
                  {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3">
        {onglet === 'consultations' && <OngletConsultations lignes={d.consultations} onNouvelle={nouvelleConsultation} />}
        {onglet === 'comptes_rendus' && <OngletComptesRendus lignes={d.comptes_rendus} patientId={id} />}
        {onglet === 'ordonnances' && <OngletOrdonnances lignes={d.ordonnances} />}
        {onglet === 'examens' && (
          <OngletExamens
            lignes={d.examens}
            onResultat={async (idExamen, resultat) => {
              const { error } = await supabase
                .from('examens_demandes')
                .update({
                  resultat,
                  statut: 'Résultat disponible',
                  date_resultat: new Date().toISOString(),
                })
                .eq('id', idExamen)
              if (error) {
                setErreur(`Résultat non enregistré : ${error.message}`)
                return
              }
              setD((x) => ({
                ...x,
                examens: x.examens.map((e) =>
                  e.id === idExamen
                    ? { ...e, resultat, statut: 'Résultat disponible', date_resultat: new Date().toISOString() }
                    : e
                ),
              }))
            }}
          />
        )}
        {onglet === 'antecedents' && (
          <OngletAntecedents
            lignes={d.antecedents}
            onAjouter={() => setModaleAntecedent(true)}
            onSupprimer={async (idAnt) => {
              await supabase.from('antecedents').delete().eq('id', idAnt)
              setD((x) => ({ ...x, antecedents: x.antecedents.filter((a) => a.id !== idAnt) }))
            }}
          />
        )}
        {onglet === 'documents' && <OngletDocuments lignes={d.documents} />}
      </div>

      <ModaleAntecedent
        ouverte={modaleAntecedent}
        onFermer={() => setModaleAntecedent(false)}
        patientId={id}
        onAjoute={(ligne) => {
          setD((x) => ({ ...x, antecedents: [ligne, ...x.antecedents] }))
          setModaleAntecedent(false)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ onglets */

function OngletConsultations({ lignes, onNouvelle }) {
  if (!lignes.length)
    return (
      <Carte>
        <Vide
          icone={Stethoscope}
          titre="Aucune consultation"
          texte="Ce patient n’a pas encore d’historique de consultation."
          action={
            <button onClick={onNouvelle} className="btn-primaire">
              <Plus className="h-[14px] w-[14px]" /> Ouvrir une consultation
            </button>
          }
        />
      </Carte>
    )
  return (
    <Carte>
      <div className="overflow-x-auto fin">
        <table className="grille min-w-[760px]">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Type</th>
              <th>Motif</th>
              <th>Diagnostic</th>
              <th>Médecin</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap font-mono text-[11px] text-encre/50">
                  <Link to={`/consultations/${x.id}`} className="hover:text-sarcelle">
                    {x.numero}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-[12px]">{dateHeureFr(x.date_consultation)}</td>
                <td className="text-[12px] text-encre/65">{x.type_consultation}</td>
                <td className="max-w-[180px] truncate text-[12px]" title={x.motif ?? ''}>
                  {x.motif || '—'}
                </td>
                <td className="max-w-[180px] truncate text-[12px]" title={x.diagnostic ?? ''}>
                  {x.diagnostic || '—'}
                </td>
                <td className="whitespace-nowrap text-[12px] text-encre/65">
                  {x.medecin ? `${x.medecin.civilite ?? ''} ${x.medecin.nom ?? ''}` : '—'}
                </td>
                <td>
                  <Puce>{x.statut}</Puce>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Carte>
  )
}

function OngletComptesRendus({ lignes, patientId }) {
  if (!lignes.length)
    return (
      <Carte>
        <Vide
          icone={FileText}
          titre="Aucun compte rendu"
          texte="Rédigez un compte rendu depuis une consultation ou créez-en un directement."
          action={
            <Link to={`/comptes-rendus/nouveau?patient=${patientId}`} className="btn-primaire">
              <Plus className="h-[14px] w-[14px]" /> Rédiger un compte rendu
            </Link>
          }
        />
      </Carte>
    )
  return (
    <Carte>
      <ul className="divide-y divide-sarcelle-100">
        {lignes.map((x) => (
          <li key={x.id}>
            <Link to={`/comptes-rendus/${x.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sarcelle-50/70">
              <span className="font-mono text-[11px] text-encre/45">{x.numero}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ardoise">{x.titre}</span>
              <span className="hidden text-[11.5px] text-encre/50 sm:block">{x.categorie}</span>
              <span className="whitespace-nowrap text-[11.5px] text-encre/50">{dateFr(x.date_cr)}</span>
              <Puce>{x.statut}</Puce>
            </Link>
          </li>
        ))}
      </ul>
    </Carte>
  )
}

function OngletOrdonnances({ lignes }) {
  if (!lignes.length)
    return (
      <Carte>
        <Vide icone={Pill} titre="Aucune ordonnance" texte="Les ordonnances se rédigent depuis la fiche de consultation." />
      </Carte>
    )
  return (
    <div className="space-y-3">
      {lignes.map((o) => (
        <Carte key={o.id} titre={`Ordonnance ${o.numero}`} sous={dateHeureFr(o.date_ordonnance)}>
          <ul className="divide-y divide-sarcelle-100">
            {(o.lignes ?? []).map((l, i) => (
              <li key={i} className="px-4 py-2 text-[12.5px]">
                <span className="font-medium text-ardoise">
                  {l.medicament} {l.dosage}
                </span>
                {(l.posologie || l.duree) && (
                  <span className="text-encre/60">
                    {' — '}
                    {[l.posologie, l.duree && `pendant ${l.duree}`].filter(Boolean).join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {o.note && <p className="border-t border-sarcelle-100 px-4 py-2 text-[12px] italic text-encre/60">{o.note}</p>}
        </Carte>
      ))}
    </div>
  )
}

function OngletExamens({ lignes, onResultat }) {
  const [saisies, setSaisies] = useState({})

  if (!lignes.length)
    return (
      <Carte>
        <Vide icone={FlaskConical} titre="Aucun examen demandé" texte="Les demandes se font depuis la consultation." />
      </Carte>
    )

  const enAttente = lignes.filter((x) => x.statut !== 'Résultat disponible')

  return (
    <Carte
      titre="Examens"
      sous={
        enAttente.length
          ? `${enAttente.length} résultat${enAttente.length > 1 ? 's' : ''} en attente de saisie`
          : 'Tous les résultats sont saisis'
      }
    >
      <div className="overflow-x-auto fin">
        <table className="grille min-w-[780px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Examen</th>
              <th>Statut</th>
              <th>Résultat</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap text-[12px]">{dateFr(x.date_demande)}</td>
                <td className="text-[12px] text-encre/65">{x.type}</td>
                <td className="text-[12.5px]">
                  {x.libelle}
                  {x.urgent && <span className="ml-1.5 text-[11px] font-semibold uppercase text-alerte">urgent</span>}
                </td>
                <td>
                  <Puce>{x.statut}</Puce>
                </td>
                <td className="min-w-[240px]">
                  {x.statut === 'Résultat disponible' ? (
                    <span className="text-[12px] text-encre/70">
                      {x.resultat}
                      {x.date_resultat && (
                        <span className="ml-1.5 text-[10.5px] text-encre/40">
                          {dateFr(x.date_resultat)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <input
                        className="champ py-[3px]"
                        placeholder="Saisir le résultat"
                        value={saisies[x.id] ?? ''}
                        onChange={(e) => setSaisies((s) => ({ ...s, [x.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (saisies[x.id] ?? '').trim())
                            onResultat(x.id, saisies[x.id].trim())
                        }}
                      />
                      <button
                        onClick={() => onResultat(x.id, (saisies[x.id] ?? '').trim())}
                        disabled={!(saisies[x.id] ?? '').trim()}
                        className="btn-secondaire shrink-0"
                      >
                        Noter
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Carte>
  )
}

function OngletAntecedents({ lignes, onAjouter, onSupprimer }) {
  return (
    <Carte
      titre="Antécédents"
      action={
        <button onClick={onAjouter} className="btn-secondaire">
          <Plus className="h-[14px] w-[14px]" /> Ajouter
        </button>
      }
    >
      {!lignes.length ? (
        <Vide icone={ClipboardList} titre="Aucun antécédent consigné" texte="Ajoutez les antécédents connus du patient." />
      ) : (
        <ul className="divide-y divide-sarcelle-100">
          {lignes.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
              <Puce ton="Validé">{a.type}</Puce>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-ardoise">
                  {a.libelle}
                  {a.annee && <span className="ml-1.5 font-mono text-[11px] text-encre/45">{a.annee}</span>}
                </span>
                {a.description && <span className="block text-[12px] text-encre/60">{a.description}</span>}
              </span>
              <button
                onClick={() => onSupprimer(a.id)}
                className="text-encre/25 transition hover:text-alerte"
                aria-label={`Supprimer ${a.libelle}`}
              >
                <Trash2 className="h-[13px] w-[13px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  )
}

function OngletDocuments({ lignes }) {
  if (!lignes.length)
    return (
      <Carte>
        <Vide
          icone={Paperclip}
          titre="Aucun document"
          texte="Les pièces jointes déposées dans Supabase Storage apparaîtront ici."
        />
      </Carte>
    )
  return (
    <Carte>
      <ul className="divide-y divide-sarcelle-100">
        {lignes.map((x) => (
          <li key={x.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
            <Paperclip className="h-[14px] w-[14px] text-encre/35" />
            <span className="min-w-0 flex-1 truncate">{x.nom}</span>
            <span className="text-[11.5px] text-encre/50">{dateFr(x.created_at)}</span>
            {x.url && (
              <a href={x.url} target="_blank" rel="noreferrer" className="btn-fantome text-[12px]">
                Ouvrir
              </a>
            )}
          </li>
        ))}
      </ul>
    </Carte>
  )
}

/* -------------------------------------------------------- modale antécédent */

const TYPES_ANTECEDENTS = [
  'Médical',
  'Chirurgical',
  'Familial',
  'Allergique',
  'Gynéco-obstétrical',
  'Mode de vie',
]

function ModaleAntecedent({ ouverte, onFermer, patientId, onAjoute }) {
  const [f, setF] = useState({ type: 'Médical', libelle: '', annee: '', description: '' })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const enregistrer = async () => {
    if (!f.libelle.trim()) {
      setErreur('Indiquez l’intitulé de l’antécédent.')
      return
    }
    setEnvoi(true)
    const { data, error } = await supabase
      .from('antecedents')
      .insert({
        patient_id: patientId,
        type: f.type,
        libelle: f.libelle.trim(),
        annee: f.annee.trim() || null,
        description: f.description.trim() || null,
      })
      .select()
      .single()
    setEnvoi(false)
    if (error) {
      setErreur(`Enregistrement impossible : ${error.message}`)
      return
    }
    setF({ type: 'Médical', libelle: '', annee: '', description: '' })
    setErreur('')
    onAjoute(data)
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Ajouter un antécédent"
      taille="sm"
      pied={
        <>
          <button onClick={onFermer} className="btn-fantome">
            Annuler
          </button>
          <button onClick={enregistrer} disabled={envoi} className="btn-primaire">
            {envoi ? 'Enregistrement…' : 'Ajouter'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {erreur && <Alerte>{erreur}</Alerte>}
        <Choix
          label="Type"
          vide={null}
          options={TYPES_ANTECEDENTS}
          value={f.type}
          onChange={(e) => setF((v) => ({ ...v, type: e.target.value }))}
        />
        <Champ
          label="Intitulé"
          value={f.libelle}
          onChange={(e) => setF((v) => ({ ...v, libelle: e.target.value }))}
          placeholder="Hypertension artérielle, appendicectomie…"
        />
        <Champ
          label="Année"
          value={f.annee}
          onChange={(e) => setF((v) => ({ ...v, annee: e.target.value }))}
          placeholder="2019"
        />
        <Zone
          label="Précisions"
          rows={3}
          value={f.description}
          onChange={(e) => setF((v) => ({ ...v, description: e.target.value }))}
        />
      </div>
    </Modale>
  )
}
