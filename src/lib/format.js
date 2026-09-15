// Helpers de formatage — français / Gabon, franc CFA (XAF)

export const dateFr = (v) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

export const dateHeureFr = (v) =>
  v
    ? new Date(v).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

export const jourLong = (v = new Date()) =>
  new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Valeur pour <input type="datetime-local"> à partir d'un timestamp
export const pourInputDateHeure = (v) => {
  const d = v ? new Date(v) : new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const fcfa = (n) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0)) + ' F'

export const age = (dateNaissance) => {
  if (!dateNaissance) return ''
  const n = new Date(dateNaissance)
  if (Number.isNaN(n.getTime())) return ''
  const t = new Date()
  let a = t.getFullYear() - n.getFullYear()
  const m = t.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < n.getDate())) a--
  return a < 0 ? '' : a
}

export const nomComplet = (p) => (p ? `${p.nom ?? ''} ${p.prenom ?? ''}`.trim() : '')

export const initiales = (p) =>
  ((p?.nom?.[0] ?? '') + (p?.prenom?.[0] ?? '')).toUpperCase() || '—'

// Indice de masse corporelle à partir du poids (kg) et de la taille (cm ou m)
export const imc = (poids, taille) => {
  const p = parseFloat(String(poids).replace(',', '.'))
  let t = parseFloat(String(taille).replace(',', '.'))
  if (!p || !t) return ''
  if (t > 3) t = t / 100 // saisie en centimètres
  const v = p / (t * t)
  return Number.isFinite(v) ? v.toFixed(1) : ''
}

export const interpretationImc = (v) => {
  const n = parseFloat(v)
  if (!n) return ''
  if (n < 18.5) return 'Insuffisance pondérale'
  if (n < 25) return 'Corpulence normale'
  if (n < 30) return 'Surpoids'
  if (n < 35) return 'Obésité modérée'
  if (n < 40) return 'Obésité sévère'
  return 'Obésité morbide'
}
