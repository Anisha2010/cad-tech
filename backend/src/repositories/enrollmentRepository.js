import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Development-only JSON enrollment storage; replace this repository with durable production storage before live payments.
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const file = path.join(directory, 'enrollments.json')

function read() {
  fs.mkdirSync(directory, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8')
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('Enrollment storage must contain an array')
  return parsed
}

function write(records) {
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(records, null, 2), 'utf8')
  fs.renameSync(temporary, file)
}

export const findActiveEnrollment = (userId, courseSlug) => read().find((enrollment) => enrollment.userId === userId && enrollment.courseSlug === courseSlug && enrollment.status === 'active') || null
export const createEnrollment = (enrollment) => { const records = read(); const existing = records.find((item) => item.userId === enrollment.userId && item.courseSlug === enrollment.courseSlug && item.status === 'active'); if (existing) return existing; const created = { id: crypto.randomUUID(), ...enrollment }; records.push(created); write(records); return created }
export const listActiveEnrollments = (userId) => read().filter((enrollment) => enrollment.userId === userId && enrollment.status === 'active')