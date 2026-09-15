import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, LayoutTemplate } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { dateFr, dateHeureFr } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { Carte, Chargement, Vide, Puce } from '../components/ui'
import { Recherche, BoutonExport, BoutonReinitialiser, ZoneFiltres, Filtre } from '../components/DataToolbar'

const FILTRES_VIDES = { terme: '', du: '', au: '', statut: '', categorie: '', mesCr: false }

export default function ComptesRendusList() {
  const { medecin } = useAuth()
  const [f, setF] = useState(FILTRES_VIDES)
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    ;(async () => {
      let q = supabase
        .from('comptes_rendus')
        .select(
          'id, numero, titre, categorie, statut, date_cr, contenu, ' +
            'patient:patients(id, code, nom, prenom), ' +
            'consultation:consultations(id, numero), ' +
            'medecin:medecins(civilite, nom, prenom), ' +
            'modele:modeles_compte_rendu(nom)'
        )
        .order('date_cr', { ascending: false })
        .limit(1000)

      if (f.du) q = q.gte('date_cr', new Date(`${f.du}T00:00:00`).toISOString())
      if (f.au) q = q.lte('date_cr', new Date(`${f.au}T23:59:59`).toISOString())
      if (f.statut) q = q.eq('statut', f.statut)
      if (f.categorie) q = q.eq('categorie', f.categorie)
      if (f.mesCr && medecin?.id) q = q.eq('medecin_id', medecin.id)

      const { data } = await q
      setLignes(data ?? [])
      setChargement(false)
    })()
  }, [f.du, f.au, f.statut, f.categorie, f.mesCr, medecin?.id])

  const visibles = useMemo(() => {
    const t = f.terme.trim().toLowerCase()
    if (!t) return lignes
    return lignes.filter((x) =>
      [x.numero, x.titre, x.patient?.nom, x.patient?.prenom, x.patient?.code, x.contenu]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    )
  }, [lignes, f.terme])

  const exporter = () =>
    exporterExcel(
      visibles.map((x) => ({
        'N° compte rendu': x.numero,
        Date: dateHeureFr(x.date_cr),
        Titre: x.titre ?? '',
        Catégorie: x.categorie ?? '',
        Modèle: x.modele?.nom ?? '',
        Statut: x.statut ?? '',
        'N° dossier': x.patient?.code ?? '',
        Patient: `${x.patient?.nom ?? ''} ${x.patient?.prenom ?? ''}`.trim(),
        'N° consultation': x.consultation?.numero ?? '',
        Médecin: `${x.medecin?.civilite ?? ''} ${x.medecin?.nom ?? ''} ${x.medecin?.prenom ?? ''}`.trim(),
        'Nombre de caractères': (x.contenu ?? '').length,
      })),
      'comptes_rendus',
      'Comptes rendus'
    )

  const filtresActifs = JSON.stringify(f) !== JSON.stringify(FILTRES_VIDES)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">Comptes rendus</h1>
          <p className="mt-0.5 text-[12.5px] text-encre/55">
            Documents rédigés à partir de vos modèles, alimentés par les données du dossier.
          </p>
        </div>
        <Link to="/modeles" className="btn-secondaire">
          <LayoutTemplate className="h-[14px] w-[14px]" /> Configurer les modèles
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
              placeholder="Patient, titre, contenu, n° de document"
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
            <select className="champ w-[124px]" value={f.statut} onChange={(e) => set('statut')(e.target.value)}>
              <option value="">Tous</option>
              {['Brouillon', 'Validé', 'Signé'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Catégorie">
            <select className="champ w-[136px]" value={f.categorie} onChange={(e) => set('categorie')(e.target.value)}>
              <option value="">Toutes</option>
              {['Consultation', 'Imagerie', 'Biologie', 'Opératoire', 'Certificat', 'Courrier'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Praticien">
            <select
              className="champ w-[150px]"
              value={f.mesCr ? 'moi' : 'tous'}
              onChange={(e) => set('mesCr')(e.target.value === 'moi')}
            >
              <option value="tous">Tous les médecins</option>
              <option value="moi">Mes comptes rendus</option>
            </select>
          </Filtre>
        </ZoneFiltres>

        {chargement ? (
          <Chargement />
        ) : visibles.length === 0 ? (
          <Vide
            icone={FileText}
            titre="Aucun compte rendu"
            texte={
              filtresActifs
                ? 'Aucun document ne correspond aux filtres appliqués.'
                : 'Les comptes rendus se rédigent depuis une fiche de consultation.'
            }
            action={
              <Link to="/consultations/liste" className="btn-primaire">
                Ouvrir le registre des consultations
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto fin">
            <table className="grille min-w-[900px]">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Titre</th>
                  <th>Catégorie</th>
                  <th>Modèle</th>
                  <th>Médecin</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((x) => (
                  <tr key={x.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-encre/50">
                      <Link to={`/comptes-rendus/${x.id}`} className="hover:text-sarcelle">
                        {x.numero}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-[12px]">{dateFr(x.date_cr)}</td>
                    <td>
                      <Link to={`/comptes-rendus/${x.id}`} className="block">
                        <span className="font-medium text-ardoise">
                          {x.patient?.nom} {x.patient?.prenom}
                        </span>
                        <span className="ml-1.5 font-mono text-[10.5px] text-encre/40">{x.patient?.code}</span>
                      </Link>
                    </td>
                    <td className="max-w-[220px] truncate text-[12.5px]" title={x.titre ?? ''}>
                      {x.titre}
                    </td>
                    <td className="text-[12px] text-encre/65">{x.categorie}</td>
                    <td className="max-w-[150px] truncate text-[12px] text-encre/55">{x.modele?.nom ?? '—'}</td>
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
        )}
      </Carte>
    </div>
  )
}
