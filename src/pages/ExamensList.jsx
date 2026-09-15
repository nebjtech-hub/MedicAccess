import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { dateFr, initiales, age } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { Carte, Chargement, Vide, Puce } from '../components/ui'
import { Recherche, BoutonExport, BoutonReinitialiser, ZoneFiltres, Filtre } from '../components/DataToolbar'

const FILTRES_VIDES = { terme: '', du: '', au: '', etat: 'attente', type: '', urgent: false }

export default function ExamensList() {
  const [f, setF] = useState(FILTRES_VIDES)
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    ;(async () => {
      let q = supabase
        .from('examens_demandes')
        .select(
          'id, libelle, code, type, statut, resultat, urgent, date_demande, date_resultat, ' +
            'patient:patients(id, code, nom, prenom, sexe, date_naissance, telephone), ' +
            'consultation:consultations(numero)'
        )
        .order('date_demande', { ascending: false })
        .limit(3000)

      if (f.du) q = q.gte('date_demande', new Date(`${f.du}T00:00:00`).toISOString())
      if (f.au) q = q.lte('date_demande', new Date(`${f.au}T23:59:59`).toISOString())
      if (f.type) q = q.eq('type', f.type)
      if (f.urgent) q = q.eq('urgent', true)
      if (f.etat === 'attente') q = q.in('statut', ['Demandé', 'En cours'])
      if (f.etat === 'saisis') q = q.eq('statut', 'Résultat disponible')

      const { data } = await q
      setLignes(data ?? [])
      setChargement(false)
    })()
  }, [f.du, f.au, f.type, f.urgent, f.etat])

  /* Une ligne par patient : le détail s'ouvre au clic. */
  const patients = useMemo(() => {
    const t = f.terme.trim().toLowerCase()
    const par = new Map()

    lignes.forEach((x) => {
      const p = x.patient
      if (!p) return
      if (
        t &&
        ![p.nom, p.prenom, p.code, p.telephone, x.libelle]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(t))
      )
        return

      const e = par.get(p.id) ?? {
        patient: p, total: 0, attente: 0, urgents: 0, derniere: null, libelles: new Set(),
      }
      e.total++
      if (x.statut !== 'Résultat disponible') e.attente++
      if (x.urgent && x.statut !== 'Résultat disponible') e.urgents++
      e.libelles.add(x.libelle)
      if (!e.derniere || new Date(x.date_demande) > new Date(e.derniere)) e.derniere = x.date_demande
      par.set(p.id, e)
    })

    return [...par.values()].sort((a, b) => {
      if (b.urgents !== a.urgents) return b.urgents - a.urgents
      if (b.attente !== a.attente) return b.attente - a.attente
      return new Date(b.derniere) - new Date(a.derniere)
    })
  }, [lignes, f.terme])

  const visibles = useMemo(() => {
    const t = f.terme.trim().toLowerCase()
    if (!t) return lignes
    return lignes.filter((x) =>
      [x.patient?.nom, x.patient?.prenom, x.patient?.code, x.libelle]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    )
  }, [lignes, f.terme])

  const exporter = () =>
    exporterExcel(
      visibles.map((x) => ({
        'N° dossier': x.patient?.code ?? '',
        Patient: `${x.patient?.nom ?? ''} ${x.patient?.prenom ?? ''}`.trim(),
        Sexe: x.patient?.sexe ?? '',
        Âge: x.patient?.date_naissance ? age(x.patient.date_naissance) : '',
        'N° consultation': x.consultation?.numero ?? '',
        Type: x.type ?? '',
        Examen: x.libelle,
        Code: x.code ?? '',
        Urgent: x.urgent ? 'Oui' : '',
        'Prescrit le': dateFr(x.date_demande),
        Statut: x.statut ?? '',
        Résultat: x.resultat ?? '',
        'Résultat le': dateFr(x.date_resultat),
      })),
      'examens',
      'Examens'
    )

  const filtresActifs = JSON.stringify(f) !== JSON.stringify(FILTRES_VIDES)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const totalAttente = patients.reduce((n, p) => n + p.attente, 0)

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">Examens</h1>
        <p className="mt-0.5 text-[12.5px] text-encre/55">
          {totalAttente > 0
            ? `${totalAttente} résultat${totalAttente > 1 ? 's' : ''} à saisir. Cliquez sur un patient pour ouvrir le détail.`
            : 'Cliquez sur un patient pour voir ses examens et saisir les résultats.'}
        </p>
      </div>

      <Carte>
        <ZoneFiltres
          resultat={patients.length}
          actions={
            <>
              <BoutonReinitialiser visible={filtresActifs} onClick={() => setF(FILTRES_VIDES)} />
              <BoutonExport onClick={exporter} desactive={!visibles.length} />
            </>
          }
        >
          <Filtre label="Recherche" className="min-w-[220px] flex-1">
            <Recherche
              valeur={f.terme}
              onChange={set('terme')}
              placeholder="Patient, n° dossier, examen"
              className="w-full"
            />
          </Filtre>
          <Filtre label="État">
            <select className="champ w-[150px]" value={f.etat} onChange={(e) => set('etat')(e.target.value)}>
              <option value="attente">En attente</option>
              <option value="saisis">Résultats saisis</option>
              <option value="">Tous</option>
            </select>
          </Filtre>
          <Filtre label="Type">
            <select className="champ w-[132px]" value={f.type} onChange={(e) => set('type')(e.target.value)}>
              <option value="">Tous</option>
              <option>Laboratoire</option>
              <option>Imagerie</option>
            </select>
          </Filtre>
          <Filtre label="Du">
            <input type="date" className="champ w-[142px]" value={f.du} onChange={(e) => set('du')(e.target.value)} />
          </Filtre>
          <Filtre label="Au">
            <input type="date" className="champ w-[142px]" value={f.au} onChange={(e) => set('au')(e.target.value)} />
          </Filtre>
          <Filtre label="Urgence">
            <select
              className="champ w-[128px]"
              value={f.urgent ? 'urgent' : 'tous'}
              onChange={(e) => set('urgent')(e.target.value === 'urgent')}
            >
              <option value="tous">Tous</option>
              <option value="urgent">Urgents</option>
            </select>
          </Filtre>
        </ZoneFiltres>

        {chargement ? (
          <Chargement />
        ) : patients.length === 0 ? (
          <Vide
            icone={FlaskConical}
            titre="Aucun examen"
            texte={
              filtresActifs
                ? 'Aucun examen ne correspond aux filtres appliqués.'
                : 'Les examens se prescrivent depuis l’étape « Examens proposés » de la consultation.'
            }
          />
        ) : (
          <ul className="divide-y divide-sarcelle-100">
            {patients.map((p) => (
              <li key={p.patient.id}>
                <Link
                  to={`/examens/${p.patient.id}`}
                  className="group flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-sarcelle-50/70"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[11px] font-semibold text-sarcelle-600">
                    {initiales(p.patient)}
                  </span>
                  <span className="min-w-[160px] flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13.5px] font-semibold text-ardoise">
                        {p.patient.nom} {p.patient.prenom}
                      </span>
                      <span className="font-mono text-[11px] text-encre/45">{p.patient.code}</span>
                    </span>
                    <span className="mt-[1px] block text-[11.5px] text-encre/55">
                      {p.total} examen{p.total > 1 ? 's' : ''} · dernière prescription le{' '}
                      {dateFr(p.derniere)}
                    </span>
                  </span>

                  {p.urgents > 0 && (
                    <span className="flex items-center gap-1 text-[11.5px] font-semibold text-alerte">
                      <AlertTriangle className="h-[13px] w-[13px]" /> {p.urgents} urgent
                      {p.urgents > 1 ? 's' : ''}
                    </span>
                  )}
                  {p.attente > 0 ? (
                    <Puce ton="Demandé">
                      {p.attente} à saisir
                    </Puce>
                  ) : (
                    <Puce ton="Résultat disponible">complet</Puce>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-encre/20 transition group-hover:translate-x-0.5 group-hover:text-sarcelle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  )
}
