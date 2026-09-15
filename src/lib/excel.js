/**
 * Exporte des lignes vers un fichier .xlsx.
 * @param {Array<Object>} lignes  données déjà mises en forme (clé = en-tête de colonne)
 * @param {string} nomFichier     sans extension
 * @param {string} nomFeuille
 */
export async function exporterExcel(lignes, nomFichier = 'export', nomFeuille = 'Données') {
  if (!lignes?.length) return false

  // Import différé : la bibliothèque ne pèse sur le chargement qu'au 1er export
  const XLSX = await import('xlsx')

  const feuille = XLSX.utils.json_to_sheet(lignes)

  // Largeur des colonnes calée sur le contenu le plus long
  const colonnes = Object.keys(lignes[0])
  feuille['!cols'] = colonnes.map((c) => {
    const max = lignes.reduce((m, l) => Math.max(m, String(l[c] ?? '').length), c.length)
    return { wch: Math.min(Math.max(max + 2, 10), 55) }
  })
  feuille['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: colonnes.length - 1, r: lignes.length },
    }),
  }

  const classeur = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(classeur, feuille, nomFeuille.slice(0, 31))
  const horodatage = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(classeur, `${nomFichier}_${horodatage}.xlsx`)
  return true
}
