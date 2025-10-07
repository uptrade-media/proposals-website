// /netlify/functions/create-embedded-signing.js
import docusign from 'docusign-esign'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Utility: standard CORS headers for SPA -> serverless
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Utility: JSON response with CORS
 */
function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders }, body: JSON.stringify(body) }
}

/**
 * Utility: read & base64-encode a local PDF for Raw PDF mode
 */
async function readPdfBase64(relativeOrAbsPath) {
  const resolved = path.isAbsolute(relativeOrAbsPath)
    ? relativeOrAbsPath
    : path.join(process.cwd(), relativeOrAbsPath)
  const buf = await fs.readFile(resolved)
  return buf.toString('base64')
}

export async function handler(event) {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    // ---- 0) Parse inputs ----
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

    // ---- 1) Auth — JWT service user (DocuSign developer account) ----
    const {
      DOCUSIGN_BASE_PATH,        // e.g. https://demo.docusign.net/restapi
      DOCUSIGN_OAUTH_BASE,       // e.g. account-d.docusign.com
      DOCUSIGN_INTEGRATION_KEY,  // your app GUID
      DOCUSIGN_IMPERSONATED_USER,// API user GUID
      DOCUSIGN_PRIVATE_KEY,      // base64-encoded RSA private key
    } = process.env

    if (!DOCUSIGN_BASE_PATH || !DOCUSIGN_OAUTH_BASE || !DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_IMPERSONATED_USER || !DOCUSIGN_PRIVATE_KEY) {
      return json(500, { error: 'Missing DocuSign env vars. Check DOCUSIGN_* configuration.' })
    }

    const dsApiClient = new docusign.ApiClient()
    dsApiClient.setBasePath(DOCUSIGN_BASE_PATH)
    dsApiClient.setOAuthBasePath(DOCUSIGN_OAUTH_BASE)

    const jwt = await dsApiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_IMPERSONATED_USER,
      ['signature', 'impersonation'],
      Buffer.from(DOCUSIGN_PRIVATE_KEY, 'base64'),
      3600
    )
    const accessToken = jwt.body.access_token
    dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`)

    // ---- 2) Account ----
    const userInfo = await dsApiClient.getUserInfo(accessToken)
    const account = userInfo.accounts.find(a => a.isDefault === 'true') || userInfo.accounts[0]
    const accountId = account?.accountId
    if (!accountId) return json(500, { error: 'Unable to resolve DocuSign accountId' })

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient)

    // ---- 3) Envelope definition (Template or Raw PDF) ----
    const {
      DOCUSIGN_TEMPLATE_ID,       // optional: recommended path
      PROPOSAL_PDF_PATH,          // optional: fallback path to a PDF (e.g. "netlify/functions/assets/proposal.pdf")
      COUNTERSIGN_EMAIL,          // optional: your email for routingOrder 2
      APP_ORIGIN,                 // e.g. https://your-site.com
    } = process.env

    if (!APP_ORIGIN) {
      return json(500, { error: 'Missing APP_ORIGIN env var (e.g. https://your-site.com)' })
    }

    const signerClientUserId = 'CLIENT_EMBED' // must match in RecipientView
    const recipients = []

    if (DOCUSIGN_TEMPLATE_ID) {
      // --- Template mode ---
      const signerRole = docusign.TemplateRole.constructFromObject({
        roleName: 'Signer',         // MUST match role in your template
        name: signerName,
        email: signerEmail,
        clientUserId: signerClientUserId, // enables embedded signing
        // Optionally, pass data to template tabs via 'tabs' or 'emailNotification'
      })
      recipients.push(signerRole)

      // Optional counter-signer as a second role in the template:
      // If your template already defines a counter-signer role, you can fill it here too.
      // Otherwise, omit. Many teams let an internal user sign automatically later outside embedded flow.

      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.templateId = DOCUSIGN_TEMPLATE_ID
      envelopeDefinition.templateRoles = recipients
      envelopeDefinition.status = 'sent'

      var envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    } else {
      // --- Raw PDF mode ---
      if (!PROPOSAL_PDF_PATH) {
        return json(500, { error: 'Neither DOCUSIGN_TEMPLATE_ID nor PROPOSAL_PDF_PATH provided' })
      }

      const docPdfBase64 = await readPdfBase64(PROPOSAL_PDF_PATH)

      const document = new docusign.Document()
      document.documentBase64 = docPdfBase64
      document.name = 'Uptrade Media Proposal'
      document.fileExtension = 'pdf'
      document.documentId = '1'

      // NOTE: The following SignHere uses an anchor string "\s1".
      // Your PDF must include the literal text \s1 where you want the signature,
      // or replace with absolute positioning tabs.
      const signHere = docusign.SignHere.constructFromObject({
        anchorString: '\\s1',
        anchorUnits: 'pixels',
        anchorYOffset: '0',
        anchorXOffset: '0',
      })
      const signerTabs = docusign.Tabs.constructFromObject({ signHereTabs: [signHere] })

      const signer = docusign.Signer.constructFromObject({
        email: signerEmail,
        name: signerName,
        recipientId: '1',
        clientUserId: signerClientUserId,
        routingOrder: '1',
        tabs: signerTabs,
      })

      const signers = [signer]

      // Optional counter-signer after client
      if (COUNTERSIGN_EMAIL) {
        const you = docusign.Signer.constructFromObject({
          email: COUNTERSIGN_EMAIL,
          name: 'Uptrade Media',
          recipientId: '2',
          routingOrder: '2',
        })
        signers.push(you)
      }

      const recipientsObj = docusign.Recipients.constructFromObject({ signers })
      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.emailSubject = 'Please sign your Uptrade Media proposal'
      envelopeDefinition.documents = [document]
      envelopeDefinition.recipients = recipientsObj
      envelopeDefinition.status = 'sent'

      var envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    }

    // ---- 4) Embedded Recipient View URL ----
    const viewRequest = new docusign.RecipientViewRequest()
    viewRequest.returnUrl = `${APP_ORIGIN}/docusign-return`
    viewRequest.authenticationMethod = 'none'
    viewRequest.email = signerEmail
    viewRequest.userName = signerName
    viewRequest.clientUserId = signerClientUserId

    const view = await envelopesApi.createRecipientView(accountId, envelopeSummary.envelopeId, {
      recipientViewRequest: viewRequest,
    })

    return json(200, {
      signingUrl: view.url,
      envelopeId: envelopeSummary.envelopeId,
    })
  } catch (e) {
    // Surface more helpful SDK error info if present
    const errMsg =
      (e?.response?.body && (e.response.body.message || e.response.body)) ||
      e.message ||
      'DocuSign error'
    return json(500, { error: String(errMsg) })
  }
}
