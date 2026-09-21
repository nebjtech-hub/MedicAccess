import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { age, dateFr, initiales } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { Carte, Chargement, Vide, Puce } from '../components/ui'
import { Recherche, BoutonExport, BoutonReinitialiser, ZoneFiltres, Filtre } from '../components/DataToolbar'

const FILTRES_VIDES = { terme: '', sexe: '', organisme: '', ville: '', tranche: '' }

const TRANCHES = {
  '0-5': [0, 5],
  '6-17': [6, 17],
  '18-40': [18, 40],
  '41-60': [41, 60],
  '60+': [61, 200],
}

export default function PatientsList() {
  const [f, setF] = useState(FILTRES_VIDES)
  const [lignes, setLignes] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    setChargement(true)
    supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        setLignes(data ?? [])
        setChargement(false)
      })
  }, [])

  const villes = useMemo(
    () => [...new Set(lignes.map((p) => p.ville).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [lignes]
  )

  const visibles = useMemo(() => {
    const t = f.terme.trim().toLowerCase()
    return lignes.filter((p) => {
      if (f.sexe && p.sexe !== f.sexe) return false
      if (f.organisme && (p.organisme_assurance ?? '') !== f.organisme) return false
      if (f.ville && p.ville !== f.ville) return false
      if (f.tranche) {
        const a = age(p.date_naissance)
        const [min, max] = TRANCHES[f.tranche]
        if (a === '' || a < min || a > max) return false
      }
      if (!t) return true
      return [p.nom, p.prenom, p.code, p.telephone, p.mobile, p.numero_secu, p.profession]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    })
  }, [lignes, f])

  const exporter = () =>
    exporterExcel(
      visibles.map((p) => ({
        'N° dossier': p.code,
        Nom: p.nom,
        Prénom: p.prenom ?? '',
        Sexe: p.sexe ?? '',
        'Date de naissance': dateFr(p.date_naissance),
        Âge: p.date_naissance ? age(p.date_naissance) : '',
        Profession: p.profession ?? '',
        Téléphone: p.telephone ?? '',
        Mobile: p.mobile ?? '',
        Email: p.email ?? '',
        Ville: p.ville ?? '',
        Quartier: p.quartier ?? '',
        Province: p.departement ?? '',
        Organisme: p.organisme_assurance ?? '',
        'N° sécurité sociale': p.numero_secu ?? '',
        Régime: p.regime_assurance ?? '',
        Fonds: p.fonds_cnamgs ?? '',
        'Groupe sanguin': p.groupe_sanguin ?? '',
        Allergies: p.allergies ?? '',
        'Créé le': dateFr(p.created_at),
      })),
      'patients',
      'Patients'
    )

  const filtresActifs = JSON.stringify(f) !== JSON.stringify(FILTRES_VIDES)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  return (
    <div className="px-3 py-6 lg:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ardoise">Fichier patients</h1>
          <p className="mt-0.5 text-[12.5px] text-encre/55">
            Cliquez sur un patient pour ouvrir son dossier médical électronique.
          </p>
        </div>
        <Link to="/patients/nouveau" className="btn-primaire">
          <UserPlus className="h-[14px] w-[14px]" /> Nouveau patient
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
              placeholder="Nom, n° dossier, téléphone, n° d'assuré"
              className="w-full"
            />
          </Filtre>
          <Filtre label="Sexe">
            <select className="champ w-[118px]" value={f.sexe} onChange={(e) => set('sexe')(e.target.value)}>
              <option value="">Tous</option>
              <option>Masculin</option>
              <option>Féminin</option>
            </select>
          </Filtre>
          <Filtre label="Tranche d'âge">
            <select className="champ w-[110px]" value={f.tranche} onChange={(e) => set('tranche')(e.target.value)}>
              <option value="">Toutes</option>
              {Object.keys(TRANCHES).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Assurance">
            <select className="champ w-[150px]" value={f.organisme} onChange={(e) => set('organisme')(e.target.value)}>
              <option value="">Toutes</option>
              {['CNAMGS', 'Aucune', 'Autre'].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Filtre>
          <Filtre label="Ville">
            <select className="champ w-[140px]" value={f.ville} onChange={(e) => set('ville')(e.target.value)}>
              <option value="">Toutes</option>
              {villes.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Filtre>
        </ZoneFiltres>

        {chargement ? (
          <Chargement />
        ) : visibles.length === 0 ? (
          <Vide
            icone={Users}
            titre="Aucun patient"
            texte={
              filtresActifs
                ? 'Aucun patient ne correspond aux filtres appliqués.'
                : 'Le fichier est vide. Créez la première fiche patient.'
            }
            action={
              <Link to="/patients/nouveau" className="btn-primaire">
                <UserPlus className="h-[14px] w-[14px]" /> Nouveau patient
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto fin">
            <table className="grille min-w-[900px]">
              <thead>
                <tr>
                  <th>N° dossier</th>
                  <th>Patient</th>
                  <th>Sexe</th>
                  <th>Naissance</th>
                  <th className="text-right">Âge</th>
                  <th>Téléphone</th>
                  <th>Ville</th>
                  <th>Assurance</th>
                  <th>N° assuré</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-encre/50">
                      <Link to={`/patients/${p.id}`} className="block hover:text-sarcelle">
                        {p.code}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/patients/${p.id}`} className="flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sarcelle-100 font-mono text-[10px] font-semibold text-sarcelle-600">
                          {initiales(p)}
                        </span>
                        <span className="font-medium text-ardoise">
                          {p.nom} {p.prenom}
                        </span>
                      </Link>
                    </td>
                    <td className="text-[12px] text-encre/65">{p.sexe ?? '—'}</td>
                    <td className="tabular whitespace-nowrap text-[12px] text-encre/65">{dateFr(p.date_naissance) || '—'}</td>
                    <td className="tabular text-right font-mono text-[12px]">{p.date_naissance ? age(p.date_naissance) : '—'}</td>
                    <td className="tabular whitespace-nowrap font-mono text-[12px] text-encre/70">
                      {p.telephone || p.mobile || '—'}
                    </td>
                    <td className="text-[12px] text-encre/65">{p.ville ?? '—'}</td>
                    <td>{p.organisme_assurance ? <Puce ton="Validé">{p.organisme_assurance}</Puce> : <span className="text-encre/30">—</span>}</td>
                    <td className="font-mono text-[11.5px] text-encre/60">{p.numero_secu ?? '—'}</td>
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
