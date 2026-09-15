import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Stethoscope } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { dateHeureFr, age } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { Carte, Chargement, Vide, Puce } from '../components/ui'
import { Recherche, BoutonExport, BoutonReinitialiser, ZoneFiltres, Filtre } from '../components/DataToolbar'

const FILTRES_VIDES = { terme: '', du: '', au: '', statut: '', type: '', mesConsultations: false }

export default function ConsultationsList() {
  const { medecin } = useAuth()
  const [f, setF] = useState(FILTRES_VIDES)
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    ;(async () => {
      let q = supabase
        .from('consultations')
        .select(
          'id, numero, date_consultation, type_consultation, motif, diagnostic, statut, ' +
            'patient:patients(id, code, nom, prenom, sexe, date_naissance, telephone, organisme_assurance), ' +
            'medecin:medecins(id, civilite, nom, prenom, specialite)'
        )
        .order('date_consultation', { ascending: false })
        .limit(1000)

      if (f.du) q = q.gte('date_consultation', new Date(`${f.du}T00:00:00`).toISOString())
      if (f.au) q = q.lte('date_consultation', new Date(`${f.au}T23:59:59`).toISOString())
      if (f.statut) q = q.eq('statut', f.statut)
      if (f.type) q = q.eq('type_consultation', f.type)
      if (f.mesConsultations && medecin?.id) q = q.eq('medecin_id', medecin.id)

      const { data } = await q
      setLignes(data ?? [])
      setChargement(false)
    })()
  }, [f.du, f.au, f.statut, f.type, f.mesConsultations, medecin?.id])

  const visibles = useMemo(() => {
    const t = f.terme.trim().toLowerCase()
    if (!t) return lignes
    return lignes.filter((x) =>
      [x.numero, x.patient?.nom, x.patient?.prenom, x.patient?.code, x.motif, x.diagnostic]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    )
  }, [lignes, f.terme])

  const exporter = () =>
    exporterExcel(
      visibles.map((x) => ({
        'N° consultation': x.numero,
        Date: dateHeureFr(x.date_consultation),
        'N° dossier': x.patient?.code ?? '',
        Patient: `${x.patient?.nom ?? ''} ${x.patient?.prenom ?? ''}`.trim(),
        Sexe: x.patient?.sexe ?? '',
        Âge: x.patient?.date_naissance ? age(x.patient.date_naissance) : '',
        Téléphone: x.patient?.telephone ?? '',
        Assurance: x.patient?.organisme_assurance ?? '',
        Médecin: `${x.medecin?.civilite ?? ''} ${x.medecin?.nom ?? ''} ${x.medecin?.prenom ?? ''}`.trim(),
        Type: x.type_consultation ?? '',
        Motif: x.motif ?? '',
        Diagnostic: x.diagnostic ?? '',
        Statut: x.statut ?? '',
      })),
      'consultations',
      'Consultations'
    )

  const filtresActifs = JSON.stringify(f) !== JSON.stringify(FILTRES_VIDES)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">Registre des consultations</h1>
          <p className="mt-0.5 text-[12.5px] text-encre/55">
            Consultations enregistrées, tous praticiens confondus.
          </p>
        </div>
        <Link to="/consultations/nouvelle" className="btn-primaire">
          <Plus className="h-[14px] w-[14px]" /> Nouvelle consultation
        </Link>
      </div>

      <Carte>
        <ZoneFiltres
          resultat={visibles.length}
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
              placeholder="Patient, n° dossier, motif, diagnostic"
              className="w-full"
            />
          </Filtre>
          <Filtre label="Du">
            <input type="date" className="champ w-[142px]" value={f.du} onChange={(e) => set('du')(e.target.value)} />
          </Filtre>
          <Filtre label="Au">
            <input type="date" className="champ w-[142px]" value={f.au} onChange={(e) => set('au')(e.target.value)} />
          </Filtre>
          <Filtre label="Statut">
            <select className="champ w-[128px]" value={f.statut} onChange={(e) => set('statut')(e.target.value)}>
              <option value="">Tous</option>
              {['En cours', 'Terminée', 'Annulée'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Type">
            <select className="champ w-[142px]" value={f.type} onChange={(e) => set('type')(e.target.value)}>
              <option value="">Tous</option>
              {['Consultation', 'Urgence', 'Contrôle', 'Téléconsultation', 'Visite à domicile'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Praticien">
            <select
              className="champ w-[150px]"
              value={f.mesConsultations ? 'moi' : 'tous'}
              onChange={(e) => set('mesConsultations')(e.target.value === 'moi')}
            >
              <option value="tous">Tous les médecins</option>
              <option value="moi">Mes consultations</option>
            </select>
          </Filtre>
        </ZoneFiltres>

        {chargement ? (
          <Chargement />
        ) : visibles.length === 0 ? (
          <Vide
            icone={Stethoscope}
            titre="Aucune consultation"
            texte={
              filtresActifs
                ? 'Aucune consultation ne correspond aux filtres appliqués.'
                : 'Le registre est vide. Ouvrez une première consultation pour le remplir.'
            }
            action={
              <Link to="/consultations/nouvelle" className="btn-primaire">
                <Plus className="h-[14px] w-[14px]" /> Nouvelle consultation
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto fin">
            <table className="grille min-w-[860px]">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Type</th>
                  <th>Motif</th>
                  <th>Diagnostic</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((x) => (
                  <tr key={x.id} className="cursor-pointer">
                    <td className="whitespace-nowrap font-mono text-[11px] text-encre/50">
                      <Link to={`/consultations/${x.id}`} className="block hover:text-sarcelle">
                        {x.numero}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-encre/70">
                      <Link to={`/consultations/${x.id}`} className="block">
                        {dateHeureFr(x.date_consultation)}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/consultations/${x.id}`} className="block">
                        <span className="font-medium text-ardoise">
                          {x.patient?.nom} {x.patient?.prenom}
                        </span>
                        <span className="ml-1.5 font-mono text-[10.5px] text-encre/40">{x.patient?.code}</span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-encre/65">{x.type_consultation}</td>
                    <td className="max-w-[190px] truncate text-[12px] text-encre/70" title={x.motif ?? ''}>
                      {x.motif || '—'}
                    </td>
                    <td className="max-w-[190px] truncate text-[12px] text-encre/70" title={x.diagnostic ?? ''}>
                      {x.diagnostic || '—'}
                    </td>
                    <td>
                      <Puce>{x.statut}</Puce>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
    </div>
  )
}
