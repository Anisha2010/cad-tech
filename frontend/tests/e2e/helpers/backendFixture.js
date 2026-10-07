import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { E2E_API_URL, E2E_BASE_URL } from './e2eEnvironment.js'

const helperDirectory = path.dirname(fileURLToPath(import.meta.url))
const backendDirectory = path.resolve(helperDirectory, '../../../../backend')

function runScript(scriptName, extraEnvironment) {
  const scriptPath = path.join(backendDirectory, 'scripts', scriptName)
  const childEnvironment = {
    ...process.env,
    E2E_BASE_URL,
    E2E_API_URL,
    ...extraEnvironment
  }

  try {
    return execFileSync(process.execPath, [scriptPath], {
      cwd: backendDirectory,
      encoding: 'utf8',
      env: childEnvironment
    })
  } catch (error) {
    let message = error.message
    for (const [key, value] of Object.entries(childEnvironment)) {
      if (value && /(PASSWORD|SECRET|URI|COOKIE|TOKEN)/i.test(key)) {
        message = message.split(value).join('[REDACTED]')
      }
    }
    throw new Error(message, { cause: error })
  }
}

export function runBackendFixtureScript(scriptName, runId) {
  const output = runScript(scriptName, { E2E_RUN_ID: runId })
  const resultLine = output.trim().split('\n').at(-1)
  return JSON.parse(resultLine)
}

export function createStudentEnrollmentFixture(runId, courseId) {
  const output = runScript('create-e2e-enrollment.js', {
    E2E_RUN_ID: runId,
    E2E_COURSE_ID: courseId
  })
  const resultLine = output.trim().split('\n').at(-1)
  return JSON.parse(resultLine)
}