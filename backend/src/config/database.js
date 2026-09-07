/**
 * Database configuration and initialization
 * Currently uses JSON file storage
 * Can be migrated to MongoDB by replacing these functions
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '../../data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

let usersCache = null

/**
 * Initialize database (create data directory if needed)
 */
export const initializeDatabase = async () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    // Load users into cache on startup
    usersCache = readUsersFromFile()
    return true
  } catch (error) {
    throw new Error('Failed to initialize database')
  }
}

/**
 * Read users from JSON file
 */
function readUsersFromFile() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Write users to JSON file
 */
function writeUsersToFile(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

/**
 * Get all users
 */
export const getAllUsers = () => {
  return usersCache || []
}

/**
 * Get user by ID
 */
export const getUserById = (userId) => {
  const users = getAllUsers()
  return users.find((user) => user.id === userId) || null
}

/**
 * Get user by email (case-insensitive)
 */
export const getUserByEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const users = getAllUsers()
  return users.find((user) => String(user.email || '').trim().toLowerCase() === normalizedEmail) || null
}

/**
 * Get user by OAuth provider and provider ID
 */
export const getUserByProvider = (provider, providerUserId) => {
  const users = getAllUsers()
  return users.find((user) =>
    (user.authProviders || []).some(
      (entry) => entry.provider === provider && String(entry.providerUserId) === String(providerUserId)
    )
  ) || null
}

/**
 * Create new user
 */
export const createUser = (userData) => {
  const users = getAllUsers()
  users.push(userData)
  usersCache = users
  writeUsersToFile(users)
  return userData
}

/**
 * Update user
 */
export const updateUser = (userId, updates) => {
  const users = getAllUsers()
  const index = users.findIndex((user) => user.id === userId)
  if (index === -1) return null

  const updatedUser = { ...users[index], ...updates }
  users[index] = updatedUser
  usersCache = users
  writeUsersToFile(users)
  return updatedUser
}

/**
 * Delete user
 */
export const deleteUser = (userId) => {
  const users = getAllUsers()
  const index = users.findIndex((user) => user.id === userId)
  if (index === -1) return false

  users.splice(index, 1)
  usersCache = users
  writeUsersToFile(users)
  return true
}

export default {
  initializeDatabase,
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserByProvider,
  createUser,
  updateUser,
  deleteUser
}
