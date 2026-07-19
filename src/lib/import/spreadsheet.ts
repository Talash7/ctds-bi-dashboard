import * as XLSX from 'xlsx'

export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })

  if (rows.length === 0) return []

  const headers = (rows[0] as string[]).map((h) => String(h ?? '').trim())
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))

  return dataRows.map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((header, i) => {
      record[header] = String(row[i] ?? '').trim()
    })
    return record
  })
}

export function downloadTemplate(filename: string, headers: string[], exampleRow: string[]) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Template')
  XLSX.writeFile(workbook, filename)
}
