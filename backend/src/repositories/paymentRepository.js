import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Development-only JSON payment storage; replace this repository with durable production storage before live payments.
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data')
const file = path.join(directory, 'payments.json')

function read() {
  fs.mkdirSync(directory, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8')
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error('Payment storage must contain an array')
  return parsed
}

function write(records) {
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(records, null, 2), 'utf8')
  fs.renameSync(temporary, file)
}

export const findPaymentByOrderId = (providerOrderId) => read().find((payment) => payment.providerOrderId === providerOrderId) || null
export const findPendingPayment = (userId, courseSlug) => read().find((payment) => payment.userId === userId && payment.courseSlug === courseSlug && payment.status === 'pending') || null
export const createPayment = (payment) => { const records = read(); records.push({ id: crypto.randomUUID(), ...payment }); write(records); return records.at(-1) }
export const updatePayment = (id, updates) => { const records = read(); const index = records.findIndex((payment) => payment.id === id); if (index < 0) return null; records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() }; write(records); return records[index] }
export const getPayments = () => read()