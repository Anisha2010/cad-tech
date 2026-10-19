import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEmailProvider } from '../src/services/emailProvider.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const runProviderSmokeTest = async ({
  env = process.env,
  providerFactory = createEmailProvider,
  logger = console
} = {}) => {
  const nodeEnv = String(env.NODE_ENV || 'development').toLowerCase()
  if (nodeEnv === 'production') throw new Error('Provider smoke tests are disabled in production.')
  if (String(env.EMAIL_PROVIDER || '').toLowerCase() !== 'resend') {
    throw new Error('Set EMAIL_PROVIDER=resend to run the provider smoke test.')
  }
  if (!String(env.RESEND_API_KEY || '').trim()) {
    throw new Error('Set RESEND_API_KEY to run the provider smoke test.')
  }

  const testConfig = {
    provider: 'resend',
    apiKey: String(env.RESEND_API_KEY).trim(),
    from: 'onboarding@resend.dev',
    configured: true,
    missing: []
  }
  const provider = providerFactory({ getConfig: () => testConfig, logger })
  const accepted = await provider.send({
    operation: 'provider_smoke_test',
    to: 'delivered@resend.dev',
    subject: 'CadTech Resend provider smoke test',
    text: 'Provider-delivery smoke test only. No account verification or password reset is being tested.',
    html: '<p>Provider-delivery smoke test only. No account verification or password reset is being tested.</p>'
  })

  if (!accepted) throw new Error('Resend did not accept the provider smoke test.')
  return 'Resend accepted the provider smoke test; this does not verify actual inbox delivery.'
}

const runCli = async () => {
  const result = dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true })
  if (result.error && result.error.code !== 'ENOENT') {
    throw new Error('Unable to load backend/.env safely.')
  }

  const message = await runProviderSmokeTest()
  console.info(`[Email] ${message}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli().catch((error) => {
    console.error(`[Email] Provider smoke test failed: ${error.message}`)
    process.exitCode = 1
  })
}
