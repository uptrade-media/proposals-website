// /netlify/functions/create-embedded-signing.js
import docusign from 'docusign-esign'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/* ---------------- Utilities ---------------- */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(body),
  }
}

async function readPdfBase64(p) {
  const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), p)
  const buf = await fs.readFile(resolved)
  return buf.toString('base64')
}

/** Load the DocuSign private key from env (supports base64 or \n-escaped PEM) */
function loadDocusignPrivateKey() {
  let pem = ''
  if (process.env.DOCUSIGN_PRIVATE_KEY_B64) {
    pem = Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY_B64, 'base64').toString('utf8')
  } else if (process.env.DOCUSIGN_PRIVATE_KEY) {
    // If stored with literal \n sequences in env, convert to real newlines
    pem = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
  }

  if (!pem || !pem.includes('BEGIN') || !pem.includes('PRIVATE KEY')) {
    throw new Error('DocuSign private key is missing or not in PEM format')
  }

  // Validate it’s an asymmetric private key (throws if invalid)
  crypto.createPrivateKey({ key: pem })
  return pem
}

/** Resolve OAuth and REST endpoints based on env */
function resolveDocusignHosts() {
  const ENV = (process.env.DOCUSIGN_ENV || '').toLowerCase()
  const explicitOAuth = (process.env.DOCUSIGN_OAUTH_BASE || '').replace(/^https?:\/\//, '')
  const explicitBasePath = process.env.DOCUSIGN_BASE_PATH // optional (often not needed)

  // Prefer explicit host if given; otherwise use ENV
  const oAuthBasePath =
    explicitOAuth || (ENV === 'prod' ? 'account.docusign.com' : 'account-d.docusign.com')

  // Base path will be determined from userInfo.accounts[i].baseUri after auth
  return { oAuthBasePath, explicitBasePath }
}

/** Create an authenticated ApiClient via JWT and return { apiClient, accessToken, accountId } */
async function getAuthenticatedClient() {
  const {
    DOCUSIGN_INTEGRATION_KEY,
    DOCUSIGN_IMPERSONATED_USER,
  } = process.env

  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_IMPERSONATED_USER) {
    throw new Error('Missing DOCUSIGN_INTEGRATION_KEY or DOCUSIGN_IMPERSONATED_USER')
  }

  const privateKey = loadDocusignPrivateKey()
  const { oAuthBasePath } = resolveDocusignHosts()

  const apiClient = new docusign.ApiClient()
  apiClient.setOAuthBasePath(oAuthBasePath) // host only, no scheme

  // Request JWT user token (1 hour)
  const jwt = await apiClient.requestJWTUserToken(
    DOCUSIGN_INTEGRATION_KEY,
    DOCUSIGN_IMPERSONATED_USER,
    ['signature', 'impersonation'],
    privateKey,
    3600
  )
  const accessToken = jwt.body.access_token
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`)

  // Get account info; pick default account
  const userInfo = await apiClient.getUserInfo(accessToken)
  const account =
    userInfo.accounts.find(a => a.isDefault === true || a.isDefault === 'true') ||
    userInfo.accounts[0]

  if (!account?.accountId) throw new Error('Unable to resolve DocuSign accountId')

  // IMPORTANT: set REST base path to the account’s baseUri + /restapi
  // e.g., https://na2.docusign.net/restapi
  if (account.baseUri) {
    apiClient.setBasePath(`${account.baseUri}/restapi`)
  }

  return { apiClient, accessToken, accountId: account.accountId }
}

/** Best-effort origin detection; returns normalized origin without trailing slash */
function resolveOrigin(event) {
  const {
    APP_ORIGIN,
  } = process.env

  const raw =
    APP_ORIGIN ||
    event.headers?.origin ||
    (event.headers?.referer ? new URL(event.headers.referer).origin : undefined) ||
    (event.headers?.host ? `https://${event.headers.host}` : undefined)

  if (!raw) throw new Error('Missing APP_ORIGIN and could not infer request origin')
  return raw.replace(/\/+$/, '')
}

/* ---------------- Lambda Handler ---------------- */

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    // ---------- Parse body ----------
    let payload = {}
    try {
      payload = JSON.parse(event.body || '{}')
    } catch {
      return json(400, { error: 'Invalid JSON body' })
    }

    const signerName = (payload.signerName || '').trim()
    const signerEmail = (payload.signerEmail || '').trim()
    const signerTitle = (payload.signerTitle || '').trim()
    const signerPhone = (payload.signerPhone || '').trim()
    const signerCompany = (payload.signerCompany || '').trim()

    if (!signerName || !signerEmail) {
      return json(400, { error: 'Missing required fields: signerName and signerEmail' })
    }

    const {
      DOCUSIGN_TEMPLATE_ID,
      PROPOSAL_PDF_PATH,
      COUNTERSIGN_EMAIL,
    } = process.env

    const ORIGIN = resolveOrigin(event)

    // ---------- Auth ----------
    const { apiClient, accountId } = await getAuthenticatedClient()
    const envelopesApi = new docusign.EnvelopesApi(apiClient)
    const signerClientUserId = 'CLIENT_EMBED'
    let envelopeSummary

    // ---------- Envelope ----------
    if (DOCUSIGN_TEMPLATE_ID) {
      // Template mode
      const signerRole = docusign.TemplateRole.constructFromObject({
        roleName: 'Signer', // MUST match your template role name exactly
        name: signerName,
        email: signerEmail,
        clientUserId: signerClientUserId, // enables embedded signing
        // Optional: pass vars into template with tabs if needed via tabs/textTabs here
      })

      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.templateId = DOCUSIGN_TEMPLATE_ID
      envelopeDefinition.templateRoles = [signerRole]
      envelopeDefinition.status = 'sent'

      envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    } else {
      // Raw PDF mode
      if (!PROPOSAL_PDF_PATH) {
        return json(500, { error: 'Neither DOCUSIGN_TEMPLATE_ID nor PROPOSAL_PDF_PATH provided' })
      }

      const docPdfBase64 = await readPdfBase64(PROPOSAL_PDF_PATH)

      const document = new docusign.Document()
      document.documentBase64 = docPdfBase64
      document.name = 'Uptrade Media Proposal'
      document.fileExtension = 'pdf'
      document.documentId = '1'

      // Anchor-based signature tab (example)
      const signHere = docusign.SignHere.constructFromObject({
        anchorString: '\\s1',
        anchorUnits: 'pixels',
        anchorYOffset: '0',
        anchorXOffset: '0',
      })
      const tabs = docusign.Tabs.constructFromObject({ signHereTabs: [signHere] })

      const signer = docusign.Signer.constructFromObject({
        email: signerEmail,
        name: signerName,
        recipientId: '1',
        clientUserId: signerClientUserId, // embedded signing key
        routingOrder: '1',
        tabs,
        // Optional: add custom fields from payload (title/phone/company) into textTabs
      })

      const signers = [signer]

      if (COUNTERSIGN_EMAIL) {
        signers.push(
          docusign.Signer.constructFromObject({
            email: COUNTERSIGN_EMAIL,
            name: 'Uptrade Media',
            recipientId: '2',
            routingOrder: '2',
          })
        )
      }

      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.emailSubject = 'Please sign your Uptrade Media proposal'
      envelopeDefinition.documents = [document]
      envelopeDefinition.recipients = docusign.Recipients.constructFromObject({ signers })
      envelopeDefinition.status = 'sent'

      envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    }

    // ---------- Embedded recipient view ----------
    const viewRequest = new docusign.RecipientViewRequest()
    viewRequest.returnUrl = `${ORIGIN}/docusign-return`
    viewRequest.authenticationMethod = 'none'
    viewRequest.email = signerEmail
    viewRequest.userName = signerName
    viewRequest.clientUserId = signerClientUserId

    const { url } = await envelopesApi.createRecipientView(
      accountId,
      envelopeSummary.envelopeId,
      { recipientViewRequest: viewRequest }
    )

    return json(200, { signingUrl: url, envelopeId: envelopeSummary.envelopeId })
  } catch (e) {
    // ---------- Enhanced error logging ----------
    console.error('=== FULL ERROR DETAILS ===')
    console.error('Error message:', e.message)
    console.error('Error name:', e.name)
    console.error('Status code:', e.response?.statusCode || e.response?.status || e.statusCode)
    console.error('Response status:', e.response?.status)
    console.error('Response statusText:', e.response?.statusText)

    let errorBody = null
    if (e.response) {
      if (e.response.body) {
        try {
          errorBody = typeof e.response.body === 'string'
            ? JSON.parse(e.response.body)
            : e.response.body
        } catch { /* noop */ }
      } else if (e.response.data) {
        errorBody = e.response.data
      }
    } else {
      console.error('No response object in error')
    }

    console.error('Stack:', e.stack)
    console.error('=========================')

    const code = errorBody?.errorCode || errorBody?.error
    const msg = errorBody?.message || e.message || 'DocuSign error'

    return json(500, { error: msg, code, details: errorBody })
  }
}
