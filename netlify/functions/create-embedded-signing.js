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
    // ---------- Parse body ----------
    let payload = {}
    try { payload = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid JSON body' }) }

    const signerName = (payload.signerName || '').trim()
    const signerEmail = (payload.signerEmail || '').trim()
    const signerTitle = (payload.signerTitle || '').trim()
    const signerPhone = (payload.signerPhone || '').trim()
    const signerCompany = (payload.signerCompany || '').trim()

    if (!signerName || !signerEmail) return json(400, { error: 'Missing required fields: signerName and signerEmail' })

    // ---------- Env ----------
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

    // Infer origin if not set, and STRIP any trailing slash
    const rawOrigin =
      APP_ORIGIN ||
      event.headers.origin ||
      (event.headers.referer ? new URL(event.headers.referer).origin : undefined) ||
      (event.headers.host ? `https://${event.headers.host}` : undefined)

    const ORIGIN = (rawOrigin || '').replace(/\/+$/, '')
    if (!DOCUSIGN_BASE_PATH || !DOCUSIGN_OAUTH_BASE || !DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_IMPERSONATED_USER || !DOCUSIGN_PRIVATE_KEY) {
      return json(500, { error: 'Missing DocuSign env vars. Set DOCUSIGN_* in Netlify.' })
    }
    if (!ORIGIN) return json(500, { error: 'Missing APP_ORIGIN and could not infer request origin' })

    console.log('DS base:', DOCUSIGN_BASE_PATH, 'oauth:', DOCUSIGN_OAUTH_BASE)
    console.log('Using template?', !!DOCUSIGN_TEMPLATE_ID, 'APP_ORIGIN/ORIGIN:', ORIGIN)

    // ---------- Auth (JWT) ----------
    const dsApiClient = new docusign.ApiClient()
    dsApiClient.setBasePath(DOCUSIGN_BASE_PATH)
    dsApiClient.setOAuthBasePath(DOCUSIGN_OAUTH_BASE) // host only, no https://

    const jwt = await dsApiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_IMPERSONATED_USER,
      ['signature', 'impersonation'],
      Buffer.from(DOCUSIGN_PRIVATE_KEY, 'base64'),
      3600
    )
    const accessToken = jwt.body.access_token
    dsApiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`)

    // ---------- Account ----------
    const userInfo = await dsApiClient.getUserInfo(accessToken)
    const account = userInfo.accounts.find(a => a.isDefault === true || a.isDefault === 'true') || userInfo.accounts[0]
    const accountId = account?.accountId
    if (!accountId) return json(500, { error: 'Unable to resolve DocuSign accountId' })

    const envelopesApi = new docusign.EnvelopesApi(dsApiClient)
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
        tabs: docusign.Tabs.constructFromObject({
          textTabs: [
            { tabLabel: 'FullName', value: signerName,  locked: true },
            { tabLabel: 'Title',    value: signerTitle, locked: true },
            { tabLabel: 'Phone',    value: signerPhone, locked: true },
            { tabLabel: 'Company',  value: signerCompany, locked: true },
            { tabLabel: 'Email',    value: signerEmail,  locked: true },
          ],
          // Optional: only if you placed a Date Signed field with this exact label in the template
          dateSignedTabs: [
            { tabLabel: 'DateSigned', locked: true }
          ]
        })
      })

      const envelopeDefinition = new docusign.EnvelopeDefinition()
      envelopeDefinition.templateId = DOCUSIGN_TEMPLATE_ID
      envelopeDefinition.templateRoles = [signerRole]
      envelopeDefinition.status = 'sent'

      envelopeSummary = await envelopesApi.createEnvelope(accountId, { envelopeDefinition })
    } else {
      // Raw PDF mode
      if (!PROPOSAL_PDF_PATH) return json(500, { error: 'Neither DOCUSIGN_TEMPLATE_ID nor PROPOSAL_PDF_PATH provided' })

      const docPdfBase64 = await readPdfBase64(PROPOSAL_PDF_PATH)

      const document = new docusign.Document()
      document.documentBase64 = docPdfBase64
      document.name = 'Uptrade Media Proposal'
      document.fileExtension = 'pdf'
      document.documentId = '1'

      // \s1 anchor must exist in your PDF; otherwise switch to absolute coords
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

    console.log('Envelope created:', envelopeSummary.envelopeId)

    // ---------- Embedded recipient view ----------
    const viewRequest = new docusign.RecipientViewRequest()
    viewRequest.returnUrl = `${ORIGIN}/docusign-return` // no double slash
    viewRequest.authenticationMethod = 'none'
    viewRequest.email = signerEmail          // MUST match the signer above
    viewRequest.userName = signerName        // MUST match the signer above
    viewRequest.clientUserId = signerClientUserId // MUST match exactly

    const { url } = await envelopesApi.createRecipientView(
      accountId,
      envelopeSummary.envelopeId,
      { recipientViewRequest: viewRequest }
    )

    return json(200, { signingUrl: url, envelopeId: envelopeSummary.envelopeId })
  } catch (e) {
    // SAFE error surface (no circular JSON)
    const body = e?.response?.body
    const code = body?.errorCode
    const msg  = body?.message || e.message || 'DocuSign error'
    console.error('DocuSign createRecipientView error:', code, msg)
    return json(500, { error: msg, code })
  }
}
