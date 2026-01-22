import * as React from 'react'
import { getManagedScripts } from './api'
import type { ManagedScriptsProps, ManagedScript } from './types'

/**
 * ManagedScripts - Server Component for injecting tracking/analytics scripts
 * 
 * Fetches scripts from Portal and renders them in the appropriate position
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { ManagedScripts } from '@uptrade/seo'
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <ManagedScripts 
 *           projectId={process.env.UPTRADE_PROJECT_ID!}
 *           position="head"
 *         />
 *       </head>
 *       <body>
 *         <ManagedScripts 
 *           projectId={process.env.UPTRADE_PROJECT_ID!}
 *           position="body-start"
 *         />
 *         {children}
 *         <ManagedScripts 
 *           projectId={process.env.UPTRADE_PROJECT_ID!}
 *           position="body-end"
 *         />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export async function ManagedScripts({
  projectId,
  position,
  path,
}: ManagedScriptsProps): Promise<React.ReactElement | null> {
  const scripts = await getManagedScripts(projectId, position, path)

  if (!scripts.length) {
    return null
  }

  return (
    <>
      {scripts.map((script: ManagedScript) => {
        if (script.script_type === 'external') {
          // External script with src
          const attrs: Record<string, unknown> = {
            key: script.id,
            src: script.src,
            ...(script.async && { async: true }),
            ...(script.defer && { defer: true }),
            ...script.attributes,
          }

          return <script {...attrs} />
        }

        // Inline script
        return (
          <script
            key={script.id}
            dangerouslySetInnerHTML={{ __html: script.content || '' }}
            {...script.attributes}
          />
        )
      })}
    </>
  )
}

/**
 * NoScript fallback component
 * 
 * Use for adding noscript content (like Google Tag Manager noscript)
 */
export async function ManagedNoScripts({
  projectId,
  path,
}: {
  projectId: string
  path?: string
}): Promise<React.ReactElement | null> {
  const scripts = await getManagedScripts(projectId, 'body-start', path)

  // Filter scripts that have noscript content
  const noscriptContent = scripts
    .filter((s: ManagedScript) => s.attributes?.noscript)
    .map((s: ManagedScript) => s.attributes?.noscript)
    .join('')

  if (!noscriptContent) {
    return null
  }

  return (
    <noscript dangerouslySetInnerHTML={{ __html: noscriptContent }} />
  )
}

export default ManagedScripts
