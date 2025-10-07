// /netlify/functions/create-embedded-signing.js
import docusign from 'docusign-esign'
import fs from 'node:fs/promises'
import path from 'node:path'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...corsHeaders }, body: JSON.stringify(body) }
}

async function readPdfBase64(p) {
  const resolved = path.isAbsolute(p) ? p : path.join(process.cwd(), p)
  const buf = await fs.readFile(resolved)
  return buf.toString('base64')
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    let payload = {}
    try { payload = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON body' }) }

    const signerName = (payload.signerName || '').trim()
    const signerEmail = (payload.signerEmail || '').trim()
    const signerTitle = (payload.signerTitle || '').trim()
    const signerPhone = (payload.signerPhone || '').trim()
    const signerCompany = (payload.signerCompany || '').trim()
    if (!signerName || !signerEmail) return json(400, { error: 'Missing required fields: signerName and signerEmail' })

    const {
      DOCUSIGN_BASE_PATH,
      DOCUSIGN_OAUTH_BASE,
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_IMPERSONATED_USER,
      DOCUSIGN_PRIVATE_KEY,
      DOCUSIGN_TEMPLATE_ID,
      PROPOSAL_PDF_PATH,
      COUNTERSIGN_EMAIL,
      APP_ORIGIN,
    } = process.env

    if (!DOCUSIGN_BASE_PATH || !DOCUSIGN_OAUTH_BASE || !DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_IMPERSONATED_USER || !DOCUSIGN_PRIVATE_KEY) {
      return json(500, { error: 'Missing DocuSign env vars. Check DOCUSIGN_* configuration.' })
    }
    if (!APP_ORIGIN) return json(500, { error: 'Missing APP_ORIGIN env var (e.g. https://your-site.com)' })

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

    const userInfo = await dsApiClient.getUserInfo(accessToken)
    const account = userInfo.accounts.find(a => a.isDefault === true || a.isDefault === 'true') || userInfo.accounts[0]
    const accountId = account?.accountId
    if (!accountId) return json(500, { error: 'Unable to resolve DocuSign accountId' })

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient)
    const signerClientUserId = 'CLIENT_EMBED'
    let envelopeSummary

    if (DOCUSIGN_TEMPLATE_ID) {
      // Template path
      const signerRole = docusign.TemplateRole.constructFromObject({
        roleName: 'Signer',
        name: signerName,
        email: signerEmail,
        clientUserId: signerClientUserId,
        tabs: docusign.Tabs.constructFromObject({
          textTabs: [
            { tabLabel: 'Title', value: signerTitle },
            { tabLabel: 'Phone', value: signerPhone },
            { tabLabel: 'Company', value: signerCompany },
          ]
        })
      })
      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.templateId = DOCUSIGN_TEMPLATE_ID
      envelopeDefinition.templateRoles = [signerRole]
      envelopeDefinition.status = 'sent'
      envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    } else {
      // Raw PDF path
      if (!PROPOSAL_PDF_PATH) return json(500, { error: 'Neither DOCUSIGN_TEMPLATE_ID nor PROPOSAL_PDF_PATH provided' })
      const docPdfBase64 = await readPdfBase64(PROPOSAL_PDF_PATH)

      const document = new docusign.Document()
      document.documentBase64 = docPdfBase64
      document.name = 'Uptrade Media Proposal'
      document.fileExtension = 'pdf'
      document.documentId = '1'

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
      if (COUNTERSIGN_EMAIL) {
        signers.push(docusign.Signer.constructFromObject({
          email: COUNTERSIGN_EMAIL,
          name: 'Uptrade Media',
          recipientId: '2',
          routingOrder: '2',
        }))
      }

      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.emailSubject = 'Please sign your Uptrade Media proposal'
      envelopeDefinition.documents = [document]
      envelopeDefinition.recipients = docusign.Recipients.constructFromObject({ signers })
      envelopeDefinition.status = 'sent'
      envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    }

    // Recipient View
    const viewRequest = new docusign.RecipientViewRequest()
    viewRequest.returnUrl = `${APP_ORIGIN}/docusign-return`
    viewRequest.authenticationMethod = 'none'
    viewRequest.email = signerEmail
    viewRequest.userName = signerName
    viewRequest.clientUserId = signerClientUserId
    // NEW: explicitly allow frames & message origins
    viewRequest.frameAncestors = [APP_ORIGIN, 'https://apps-d.docusign.com', 'https://app.docusign.com']
    viewRequest.messageOrigins = [APP_ORIGIN, 'https://apps-d.docusign.com', 'https://app.docusign.com']

    const { url } = await envelopesApi.createRecipientView(accountId, envelopeSummary.envelopeId, { recipientViewRequest: viewRequest })

    return json(200, { signingUrl: url, envelopeId: envelopeSummary.envelopeId })
  } catch (e) {
    const err = e?.response?.body || e?.response || e
    console.error('DocuSign error:', JSON.stringify(err, null, 2))
    const msg = (e?.response?.body?.message) || e.message || 'DocuSign error'
    return json(500, { error: String(msg), details: err })
  }
}
