/**
 * Codebase Scanner - Finds forms, metadata, and widgets in Next.js projects
 */

import fs from 'fs/promises'
import path from 'path'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'

// ============================================
// Types
// ============================================

export interface ScanResults {
  forms: DetectedForm[]
  metadata: DetectedMetadata[]
  widgets: DetectedWidget[]
  sitemaps: DetectedSitemap[]
}

export interface DetectedForm {
  filePath: string
  componentName: string
  fields: DetectedField[]
  hasValidation: boolean
  formLibrary: 'native' | 'react-hook-form' | 'formik' | 'unknown'
  submitsTo: string | null
  complexity: 'simple' | 'moderate' | 'complex'
  suggestedAction: 'auto-migrate' | 'assisted' | 'manual'
  startLine: number
  endLine: number
}

export interface DetectedField {
  name: string
  type: string
  label?: string
  placeholder?: string
  required: boolean
  validation?: string
  options?: Array<{ label: string; value: string }>
}

export interface DetectedMetadata {
  filePath: string
  type: 'next-metadata' | 'head' | 'next-seo' | 'other'
  title?: string
  description?: string
}

export interface DetectedWidget {
  filePath: string
  widgetType: 'intercom' | 'crisp' | 'drift' | 'hubspot' | 'zendesk' | 'other'
  scriptTag?: string
  startLine: number
  endLine: number
}

export interface DetectedSitemap {
  filePath: string
  type: 'next-sitemap' | 'next-sitemap-config' | 'custom-sitemap' | 'sitemap-plugin' | 'static-xml'
  generator?: string  // e.g., 'next-sitemap', 'custom', 'site-kit'
  startLine: number
  endLine: number
  details?: Record<string, unknown>
}

// ============================================
// Main Scanner
// ============================================

export async function scanCodebase(rootDir: string): Promise<ScanResults> {
  const results: ScanResults = {
    forms: [],
    metadata: [],
    widgets: [],
    sitemaps: [],
  }

  // Find all TSX/JSX files
  const files = await findSourceFiles(rootDir)

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const relPath = path.relative(rootDir, file)

      // Parse the file
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })

      // Scan for forms
      const forms = scanForForms(ast, content, relPath)
      results.forms.push(...forms)

      // Scan for metadata
      const metadata = scanForMetadata(ast, content, relPath)
      results.metadata.push(...metadata)

      // Scan for widgets
      const widgets = scanForWidgets(ast, content, relPath)
      results.widgets.push(...widgets)

      // Scan for sitemaps
      const sitemaps = scanForSitemaps(content, relPath)
      results.sitemaps.push(...sitemaps)

    } catch (error) {
      // Skip files that can't be parsed
      continue
    }
  }

  // Also scan for sitemap config files and static sitemaps
  const sitemapFiles = await scanForSitemapFiles(rootDir)
  results.sitemaps.push(...sitemapFiles)

  return results
}

// ============================================
// File Discovery
// ============================================

async function findSourceFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip node_modules, .next, etc
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        continue
      }
      await findSourceFiles(fullPath, files)
    } else if (entry.isFile()) {
      if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.includes('.d.ts')) {
        files.push(fullPath)
      }
    }
  }

  return files
}

// ============================================
// Form Scanner
// ============================================

function scanForForms(ast: any, content: string, filePath: string): DetectedForm[] {
  const forms: DetectedForm[] = []
  const lines = content.split('\n')

  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement
      
      // Check if it's a <form> element
      if (t.isJSXIdentifier(opening.name) && opening.name.name === 'form') {
        const fields = extractFieldsFromForm(path)
        const hasOnSubmit = opening.attributes.some(
          attr => t.isJSXAttribute(attr) && 
                  t.isJSXIdentifier(attr.name) && 
                  attr.name.name === 'onSubmit'
        )

        if (hasOnSubmit && fields.length > 0) {
          const startLine = path.node.loc?.start.line || 0
          const endLine = path.node.loc?.end.line || 0

          // Try to find component name
          let componentName = 'UnknownForm'
          let current = path.parentPath
          while (current) {
            if (t.isFunctionDeclaration(current.node) && current.node.id) {
              componentName = current.node.id.name
              break
            }
            if (t.isVariableDeclarator(current.node) && t.isIdentifier(current.node.id)) {
              componentName = current.node.id.name
              break
            }
            current = current.parentPath
          }

          // Determine complexity
          let complexity: 'simple' | 'moderate' | 'complex' = 'simple'
          if (fields.length > 5) complexity = 'moderate'
          if (fields.length > 10 || content.includes('useFieldArray') || content.includes('steps')) {
            complexity = 'complex'
          }

          forms.push({
            filePath,
            componentName,
            fields,
            hasValidation: content.includes('required') || content.includes('validate'),
            formLibrary: detectFormLibrary(content),
            submitsTo: extractSubmitUrl(content),
            complexity,
            suggestedAction: complexity === 'complex' ? 'manual' : complexity === 'moderate' ? 'assisted' : 'auto-migrate',
            startLine,
            endLine,
          })
        }
      }

      // Check for Formik <Form>
      if (t.isJSXIdentifier(opening.name) && opening.name.name === 'Form') {
        if (content.includes('Formik') || content.includes('formik')) {
          // Handle Formik forms
          const fields = extractFieldsFromFormik(path, content)
          if (fields.length > 0) {
            forms.push({
              filePath,
              componentName: 'FormikForm',
              fields,
              hasValidation: true,
              formLibrary: 'formik',
              submitsTo: null,
              complexity: 'moderate',
              suggestedAction: 'assisted',
              startLine: path.node.loc?.start.line || 0,
              endLine: path.node.loc?.end.line || 0,
            })
          }
        }
      }
    }
  })

  // Also check for react-hook-form usage
  if (content.includes('useForm') && content.includes('react-hook-form')) {
    const rhfForms = extractReactHookFormFields(content, filePath)
    forms.push(...rhfForms)
  }

  return forms
}

function extractFieldsFromForm(formPath: any): DetectedField[] {
  const fields: DetectedField[] = []
  // Track radio/checkbox groups to consolidate them
  const radioGroups = new Map<string, { required: boolean; options: Array<{ label: string; value: string }> }>()
  const checkboxGroups = new Map<string, { required: boolean; options: Array<{ label: string; value: string }> }>()

  formPath.traverse({
    JSXElement(path: any) {
      const opening = path.node.openingElement
      const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : null

      if (['input', 'textarea', 'select'].includes(tagName || '')) {
        const attrs = opening.attributes
        let name = ''
        let type = 'text'
        let placeholder = ''
        let required = false
        let value = ''

        for (const attr of attrs) {
          if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue

          const attrName = attr.name.name
          let attrValue = ''

          if (t.isStringLiteral(attr.value)) {
            attrValue = attr.value.value
          } else if (t.isJSXExpressionContainer(attr.value) && t.isStringLiteral(attr.value.expression)) {
            attrValue = attr.value.expression.value
          }

          if (attrName === 'name') name = attrValue
          if (attrName === 'type') type = attrValue
          if (attrName === 'placeholder') placeholder = attrValue
          if (attrName === 'required') required = true
          if (attrName === 'value') value = attrValue
        }

        if (!name) return

        // Handle radio buttons - group by name
        if (type === 'radio') {
          if (!radioGroups.has(name)) {
            radioGroups.set(name, { required, options: [] })
          }
          const group = radioGroups.get(name)!
          if (required) group.required = true
          if (value) {
            // Use value as both label and value (label can be extracted from nearby text/label in future)
            group.options.push({ label: value, value })
          }
          return
        }

        // Handle checkbox groups (multiple checkboxes with same name)
        if (type === 'checkbox' && value) {
          if (!checkboxGroups.has(name)) {
            checkboxGroups.set(name, { required, options: [] })
          }
          const group = checkboxGroups.get(name)!
          if (required) group.required = true
          group.options.push({ label: value, value })
          return
        }

        // Handle select elements - extract options from children
        if (tagName === 'select') {
          const selectOptions: Array<{ label: string; value: string }> = []
          
          // Traverse children to find <option> elements
          path.traverse({
            JSXElement(optionPath: any) {
              const optOpening = optionPath.node.openingElement
              const optTagName = t.isJSXIdentifier(optOpening.name) ? optOpening.name.name : null
              
              if (optTagName === 'option') {
                let optValue = ''
                let optLabel = ''
                
                // Get value attribute
                for (const attr of optOpening.attributes || []) {
                  if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue
                  if (attr.name.name === 'value' && t.isStringLiteral(attr.value)) {
                    optValue = attr.value.value
                  }
                }
                
                // Get label from children (text content)
                const children = optionPath.node.children || []
                for (const child of children) {
                  if (t.isJSXText(child)) {
                    optLabel = child.value.trim()
                  }
                }
                
                if (optValue || optLabel) {
                  selectOptions.push({
                    label: optLabel || optValue,
                    value: optValue || optLabel.toLowerCase().replace(/\s+/g, '_'),
                  })
                }
              }
            }
          })
          
          fields.push({
            name,
            type: 'select',
            placeholder,
            required,
            options: selectOptions.length > 0 ? selectOptions : undefined,
          })
          return
        }

        // Regular field
        fields.push({
          name,
          type: tagName === 'textarea' ? 'textarea' : type,
          placeholder,
          required,
        })
      }
    }
  })

  // Add consolidated radio groups as single fields
  for (const [name, group] of radioGroups) {
    fields.push({
      name,
      type: 'radio',
      required: group.required,
      options: group.options,
    })
  }

  // Add consolidated checkbox groups (only if they have multiple options)
  for (const [name, group] of checkboxGroups) {
    if (group.options.length > 1) {
      fields.push({
        name,
        type: 'checkbox',
        required: group.required,
        options: group.options,
      })
    } else {
      // Single checkbox - just a boolean field
      fields.push({
        name,
        type: 'checkbox',
        required: group.required,
      })
    }
  }

  return fields
}

function extractFieldsFromFormik(formPath: any, content: string): DetectedField[] {
  const fields: DetectedField[] = []

  formPath.traverse({
    JSXElement(path: any) {
      const opening = path.node.openingElement
      const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : null

      if (tagName === 'Field' || tagName === 'FastField') {
        const attrs = opening.attributes
        let name = ''
        let type = 'text'

        for (const attr of attrs) {
          if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue

          const attrName = attr.name.name
          let attrValue = ''

          if (t.isStringLiteral(attr.value)) {
            attrValue = attr.value.value
          }

          if (attrName === 'name') name = attrValue
          if (attrName === 'type' || attrName === 'as') type = attrValue
        }

        if (name) {
          fields.push({
            name,
            type,
            required: false,
          })
        }
      }
    }
  })

  return fields
}

function extractReactHookFormFields(content: string, filePath: string): DetectedForm[] {
  const forms: DetectedForm[] = []
  const fields: DetectedField[] = []

  // Find register calls
  const registerRegex = /register\(['"](\w+)['"]/g
  let match
  while ((match = registerRegex.exec(content)) !== null) {
    const fieldName = match[1]
    if (!fields.find(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        type: 'text', // Can't easily determine type
        required: false,
      })
    }
  }

  if (fields.length > 0) {
    forms.push({
      filePath,
      componentName: 'ReactHookForm',
      fields,
      hasValidation: content.includes('errors') || content.includes('formState'),
      formLibrary: 'react-hook-form',
      submitsTo: extractSubmitUrl(content),
      complexity: fields.length > 5 ? 'moderate' : 'simple',
      suggestedAction: 'assisted',
      startLine: 0,
      endLine: 0,
    })
  }

  return forms
}

function detectFormLibrary(content: string): 'native' | 'react-hook-form' | 'formik' | 'unknown' {
  if (content.includes('react-hook-form') || content.includes('useForm')) {
    return 'react-hook-form'
  }
  if (content.includes('formik') || content.includes('Formik')) {
    return 'formik'
  }
  if (content.includes('<form') && content.includes('onSubmit')) {
    return 'native'
  }
  return 'unknown'
}

function extractSubmitUrl(content: string): string | null {
  // Look for fetch/axios calls
  const fetchMatch = content.match(/fetch\(['"]([^'"]+)['"]/)
  if (fetchMatch) return fetchMatch[1]

  const axiosMatch = content.match(/axios\.(post|put)\(['"]([^'"]+)['"]/)
  if (axiosMatch) return axiosMatch[2]

  return null
}

// ============================================
// Metadata Scanner
// ============================================

function scanForMetadata(ast: any, content: string, filePath: string): DetectedMetadata[] {
  const metadata: DetectedMetadata[] = []

  // Check for Next.js metadata export
  if (content.includes('export const metadata') || content.includes('export const generateMetadata')) {
    let title: string | undefined
    let description: string | undefined

    const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/)
    const descMatch = content.match(/description:\s*['"]([^'"]+)['"]/)

    if (titleMatch) title = titleMatch[1]
    if (descMatch) description = descMatch[1]

    metadata.push({
      filePath,
      type: 'next-metadata',
      title,
      description,
    })
  }

  // Check for next-seo
  if (content.includes('NextSeo') || content.includes('next-seo')) {
    metadata.push({
      filePath,
      type: 'next-seo',
    })
  }

  // Check for Head component
  traverse(ast, {
    JSXElement(path) {
      const opening = path.node.openingElement
      if (t.isJSXIdentifier(opening.name) && opening.name.name === 'Head') {
        metadata.push({
          filePath,
          type: 'head',
        })
      }
    }
  })

  return metadata
}

// ============================================
// Widget Scanner
// ============================================

function scanForWidgets(ast: any, content: string, filePath: string): DetectedWidget[] {
  const widgets: DetectedWidget[] = []

  // Check for known chat widget scripts
  const widgetPatterns: Array<{ pattern: RegExp; type: DetectedWidget['widgetType'] }> = [
    { pattern: /intercom|Intercom/i, type: 'intercom' },
    { pattern: /crisp\.chat|$crisp/i, type: 'crisp' },
    { pattern: /drift\.com|driftt/i, type: 'drift' },
    { pattern: /hubspot\.com|hs-scripts/i, type: 'hubspot' },
    { pattern: /zopim|zendesk/i, type: 'zendesk' },
  ]

  for (const { pattern, type } of widgetPatterns) {
    if (pattern.test(content)) {
      // Try to find the script tag
      traverse(ast, {
        JSXElement(path) {
          const opening = path.node.openingElement
          if (t.isJSXIdentifier(opening.name) && 
              (opening.name.name === 'script' || opening.name.name === 'Script')) {
            const srcAttr = opening.attributes.find(
              attr => t.isJSXAttribute(attr) && 
                      t.isJSXIdentifier(attr.name) && 
                      attr.name.name === 'src'
            )
            
            if (srcAttr && t.isJSXAttribute(srcAttr)) {
              let src = ''
              if (t.isStringLiteral(srcAttr.value)) {
                src = srcAttr.value.value
              }
              
              if (pattern.test(src)) {
                widgets.push({
                  filePath,
                  widgetType: type,
                  scriptTag: src,
                  startLine: path.node.loc?.start.line || 0,
                  endLine: path.node.loc?.end.line || 0,
                })
              }
            }
          }
        }
      })

      // If no script tag found but pattern matched, still record it
      if (!widgets.find(w => w.widgetType === type)) {
        widgets.push({
          filePath,
          widgetType: type,
          startLine: 0,
          endLine: 0,
        })
      }
    }
  }

  return widgets
}

// ============================================
// Sitemap Scanner
// ============================================

/**
 * Scan file content for sitemap-related code
 */
function scanForSitemaps(content: string, filePath: string): DetectedSitemap[] {
  const sitemaps: DetectedSitemap[] = []

  // Check for next-sitemap package usage
  if (content.includes('next-sitemap') && !content.includes('@uptrade/site-kit')) {
    sitemaps.push({
      filePath,
      type: 'next-sitemap',
      generator: 'next-sitemap',
      startLine: findLineNumber(content, 'next-sitemap'),
      endLine: findLineNumber(content, 'next-sitemap') + 10,
    })
  }

  // Check for custom sitemap exports (app/sitemap.ts pattern)
  if (
    (filePath.endsWith('sitemap.ts') || filePath.endsWith('sitemap.js')) &&
    !content.includes('@uptrade/site-kit')
  ) {
    const isNextPattern = content.includes('MetadataRoute.Sitemap') || 
                          content.includes('export default') ||
                          content.includes('export async function')
    
    if (isNextPattern) {
      sitemaps.push({
        filePath,
        type: 'custom-sitemap',
        generator: 'custom',
        startLine: 1,
        endLine: content.split('\n').length,
        details: {
          hasAsyncFunction: content.includes('async'),
          hasDatabaseQuery: content.includes('supabase') || content.includes('prisma') || content.includes('sql'),
        },
      })
    }
  }

  // Check if already using site-kit sitemap
  if (content.includes('@uptrade/site-kit/sitemap') || content.includes('createSitemap')) {
    sitemaps.push({
      filePath,
      type: 'custom-sitemap',
      generator: 'site-kit',
      startLine: findLineNumber(content, 'createSitemap'),
      endLine: findLineNumber(content, 'createSitemap') + 10,
    })
  }

  return sitemaps
}

/**
 * Find line number of a string in content
 */
function findLineNumber(content: string, search: string): number {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(search)) {
      return i + 1
    }
  }
  return 1
}

/**
 * Scan for sitemap config files and static sitemap files
 */
async function scanForSitemapFiles(rootDir: string): Promise<DetectedSitemap[]> {
  const sitemaps: DetectedSitemap[] = []

  // Check for next-sitemap.config.js
  const configPaths = [
    'next-sitemap.config.js',
    'next-sitemap.config.mjs',
    'next-sitemap.config.ts',
  ]

  for (const configPath of configPaths) {
    const fullPath = path.join(rootDir, configPath)
    try {
      await fs.access(fullPath)
      const content = await fs.readFile(fullPath, 'utf-8')
      sitemaps.push({
        filePath: configPath,
        type: 'next-sitemap-config',
        generator: 'next-sitemap',
        startLine: 1,
        endLine: content.split('\n').length,
        details: {
          hasRobotsTxt: content.includes('generateRobotsTxt'),
          excludePaths: extractExcludePaths(content),
        },
      })
    } catch {
      // File doesn't exist
    }
  }

  // Check for static sitemap.xml in public folder
  const staticSitemapPath = path.join(rootDir, 'public', 'sitemap.xml')
  try {
    await fs.access(staticSitemapPath)
    const content = await fs.readFile(staticSitemapPath, 'utf-8')
    const urlCount = (content.match(/<url>/g) || []).length
    sitemaps.push({
      filePath: 'public/sitemap.xml',
      type: 'static-xml',
      generator: 'static',
      startLine: 1,
      endLine: content.split('\n').length,
      details: {
        urlCount,
        isIndex: content.includes('<sitemapindex'),
      },
    })
  } catch {
    // File doesn't exist
  }

  // Check for generated sitemaps in .next/server/app
  const generatedPaths = [
    '.next/server/app/sitemap.xml',
    'out/sitemap.xml',
  ]

  for (const genPath of generatedPaths) {
    const fullPath = path.join(rootDir, genPath)
    try {
      await fs.access(fullPath)
      // Don't include in results, but note that build output exists
    } catch {
      // File doesn't exist
    }
  }

  return sitemaps
}

/**
 * Extract exclude paths from next-sitemap config
 */
function extractExcludePaths(content: string): string[] {
  const excludeMatch = content.match(/exclude:\s*\[([\s\S]*?)\]/)
  if (!excludeMatch) return []
  
  const paths: string[] = []
  const matches = excludeMatch[1].matchAll(/['"]([^'"]+)['"]/g)
  for (const match of matches) {
    paths.push(match[1])
  }
  return paths
}

// ============================================
// Exports
// ============================================

export { scanForForms, scanForMetadata, scanForWidgets, scanForSitemaps, scanForSitemapFiles }
export type { DetectedSitemap }
