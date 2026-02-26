import * as XLSX from 'xlsx'

type TemplateFormat = 'csv' | 'xlsx'

function parseFormat(value: unknown): TemplateFormat {
  if (value === 'csv' || value === 'xlsx') {
    return value
  }

  return 'xlsx'
}

const templateRows = [
  {
    username: 'john.smith',
    password: 'StrongPass123',
    phoneNumber: '+998901112233',
    age: 28,
    workShift: 'day',
    objectPinned: 'Корпус A',
    objectPositions: 'Пост 1,Пост 2',
    baseSalary: 1000000,
    positionBonus: 100000,
    avatarUrl: 'https://i.pravatar.cc/128?u=john.smith',
    passportFile: 'bulk-import/john-smith.pdf'
  }
]

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const format = parseFormat(query.format)

  if (format === 'csv') {
    const worksheet = XLSX.utils.json_to_sheet(templateRows)
    const csv = XLSX.utils.sheet_to_csv(worksheet)

    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="customers-import-template.csv"')

    return csv
  }

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(templateRows)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'template')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', 'attachment; filename="customers-import-template.xlsx"')

  return buffer
})

