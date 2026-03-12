export type BinCategory = 'Макулатура' | 'Пластик' | 'Общее'
export type BinStatus = 'available' | 'loaded'

export interface WasteBinRow {
  id: number
  object_id: number | null
  category: BinCategory
  volume_m3: number
  weight_kg: number
  status: BinStatus
  created_at: string
  updated_at: string
}

export interface WasteReportRow {
  id: number
  bin_id: number
  object_id: number | null
  category: BinCategory
  amount_m3: number
  amount_kg: number
  created_at: string
}

export interface WasteBin {
  id: number
  objectId: number | null
  category: BinCategory
  volumeM3: number
  weightKg: number
  status: BinStatus
  createdAt: string
  updatedAt: string
}

export interface WasteReport {
  id: number
  binId: number
  objectId: number | null
  category: BinCategory
  amountM3: number
  amountKg: number
  createdAt: string
}

export function mapBinRow(row: WasteBinRow): WasteBin {
  return {
    id: row.id,
    objectId: row.object_id,
    category: row.category,
    volumeM3: row.volume_m3,
    weightKg: row.weight_kg,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapReportRow(row: WasteReportRow): WasteReport {
  return {
    id: row.id,
    binId: row.bin_id,
    objectId: row.object_id,
    category: row.category,
    amountM3: row.amount_m3,
    amountKg: row.amount_kg,
    createdAt: row.created_at
  }
}
