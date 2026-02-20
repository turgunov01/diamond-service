export type WorkShift = 'day' | 'night'

export interface CustomerRecord {
  id: number
  username: string
  avatar: {
    src: string
  }
  password: string
  phoneNumber: string
  passportFile: string
  age: number
  workShift: WorkShift
  objectPinned: string
  objectPositions: string[]
  baseSalary: number
  positionBonus: number
  salaryCurrency: 'UZS'
}

export interface CreateCustomerBody {
  username: string
  avatar: {
    src: string
  }
  password: string
  phoneNumber: string
  passportFile: string
  age: number
  workShift: WorkShift
  objectPinned: string
  objectPositions: string[]
  baseSalary?: number
  positionBonus?: number
  salaryCurrency?: 'UZS'
}

export interface UpdateCustomerBody {
  workShift?: WorkShift
  baseSalary?: number
  positionBonus?: number
}

export interface CustomerDbRow {
  id: number
  username: string
  avatar: string
  password: string
  phone_number: string
  passport_file: string
  age: number
  work_shift: WorkShift
  object_pinned: string
  object_positions: string[]
  base_salary?: number
  position_bonus?: number
  salary_currency?: 'UZS'
}

export function mapCustomerDbRowToRecord(row: CustomerDbRow): CustomerRecord {
  return {
    id: row.id,
    username: row.username,
    avatar: { src: row.avatar },
    password: row.password,
    phoneNumber: row.phone_number,
    passportFile: row.passport_file,
    age: row.age,
    workShift: row.work_shift,
    objectPinned: row.object_pinned,
    objectPositions: row.object_positions,
    baseSalary: row.base_salary ?? 1000000,
    positionBonus: row.position_bonus ?? 0,
    salaryCurrency: row.salary_currency ?? 'UZS'
  }
}

export function mapCreateBodyToDbInsert(body: CreateCustomerBody) {
  return {
    username: body.username,
    avatar: body.avatar.src,
    password: body.password,
    phone_number: body.phoneNumber,
    passport_file: body.passportFile,
    age: body.age,
    work_shift: body.workShift,
    object_pinned: body.objectPinned,
    object_positions: body.objectPositions,
    base_salary: body.baseSalary ?? 1000000,
    position_bonus: body.positionBonus ?? 0,
    salary_currency: body.salaryCurrency ?? 'UZS'
  }
}

export function mapUpdateBodyToDbUpdate(body: UpdateCustomerBody) {
  const update: {
    work_shift?: WorkShift
    base_salary?: number
    position_bonus?: number
  } = {}

  if (body.workShift) {
    update.work_shift = body.workShift
  }
  if (typeof body.baseSalary === 'number') {
    update.base_salary = body.baseSalary
  }
  if (typeof body.positionBonus === 'number') {
    update.position_bonus = body.positionBonus
  }

  return update
}
