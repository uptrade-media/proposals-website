/**
 * Code Migrator - Transforms existing forms to Site-Kit managed forms
 */

import fs from 'fs/promises'
import path from 'path'
import { parse } from '@babel/parser'
import generate from '@babel/generator'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import type { ScanResults, DetectedForm, DetectedField } from '../scanner/index.js'

// ============================================
// Types
// ============================================

export interface MigrationResult {
  filePath: string
  success: boolean
  changes: string[]
  error?: string
  formId?: string
}

export interface MigrationOptions {
  projectId: string
  apiKey: string
  dryRun?: boolean
}

// ============================================
// Main Migrator
// ============================================

export async function migrateFiles(
  scanResults: ScanResults,
  options: MigrationOptions
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = []

  // Migrate forms
  for (const form of scanResults.forms) {
    if (form.suggestedAction === 'manual') {
      results.push({
        filePath: form.filePath,
        success: false,
        changes: [],
        error: 'Form too complex for auto-migration',
      })
      continue
    }

    try {
      const result = await migrateForm(form, options)
      results.push(result)
    } catch (error: any) {
      results.push({
        filePath: form.filePath,
        success: false,
        changes: [],
        error: error.message,
      })
    }
  }

  // Migrate widgets (simpler - just remove and add provider flag)
  for (const widget of scanResults.widgets) {
    try {
      const result = await migrateWidget(widget.filePath, widget, options)
      results.push(result)
    } catch (error: any) {
      results.push({
        filePath: widget.filePath,
        success: false,
        changes: [],
        error: error.message,
      })
    }
  }

  return results
}

// ============================================
// Form Migration
// ============================================

async function migrateForm(
  form: DetectedForm,
  options: MigrationOptions
): Promise<MigrationResult> {
  const changes: string[] = []
  const fullPath = path.resolve(process.cwd(), form.filePath)

  // Step 1: Create the form in Uptrade
  const formSlug = generateSlug(form.componentName)
  const formId = await createFormInUptrade(form, formSlug, options)
  changes.push(`Created managed form: ${formSlug}`)

  if (options.dryRun) {
    changes.push('[DRY RUN] Would update file')
    return { filePath: form.filePath, success: true, changes, formId }
  }

  // Step 2: Read the file
  const content = await fs.readFile(fullPath, 'utf-8')
  
  // Step 3: Generate new code
  const newCode = generateMigratedFormCode(form, formSlug)

  // Step 4: Write the file
  await fs.writeFile(fullPath, newCode, 'utf-8')
  changes.push('Updated component to use useForm hook')

  return {
    filePath: form.filePath,
    success: true,
    changes,
    formId,
  }
}

function generateMigratedFormCode(form: DetectedForm, formSlug: string): string {
  // Generate a clean, migrated component
  const componentName = form.componentName || 'MigratedForm'

  return `/**
 * ${componentName}
 * 
 * Migrated to @uptrade/site-kit
 * Managed form: ${formSlug}
 */

'use client'

import { useForm } from '@uptrade/site-kit/forms'

export function ${componentName}({ className }: { className?: string }) {
  const { 
    form,
    fields, 
    values, 
    errors, 
    setFieldValue, 
    submit, 
    isSubmitting,
    isComplete 
  } = useForm('${formSlug}')

  if (isComplete) {
    return (
      <div className={className}>
        <p className="text-green-600">{form?.successMessage || 'Thanks for your submission!'}</p>
      </div>
    )
  }

  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); submit() }} 
      className={className}
    >
      {fields.map(field => (
        <div key={field.slug} className="mb-4">
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.fieldType === 'textarea' ? (
            <textarea
              name={field.slug}
              placeholder={field.placeholder}
              value={String(values[field.slug] || '')}
              onChange={(e) => setFieldValue(field.slug, e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          ) : field.fieldType === 'select' && field.options ? (
            <select
              name={field.slug}
              value={String(values[field.slug] || '')}
              onChange={(e) => setFieldValue(field.slug, e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              {field.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.fieldType}
              name={field.slug}
              placeholder={field.placeholder}
              value={String(values[field.slug] || '')}
              onChange={(e) => setFieldValue(field.slug, e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
          
          {errors[field.slug] && (
            <p className="mt-1 text-sm text-red-500">{errors[field.slug]}</p>
          )}
          
          {field.helpText && (
            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
      ))}
      
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : (form?.submitButtonText || 'Submit')}
      </button>
    </form>
  )
}

export default ${componentName}
`
}

async function createFormInUptrade(
  form: DetectedForm,
  slug: string,
  options: MigrationOptions
): Promise<string> {
  // Call Portal API to create the form
  const response = await fetch('https://api.uptrademedia.com/forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      projectId: options.projectId,
      slug,
      name: formatName(form.componentName),
      formType: detectFormType(form),
      successMessage: 'Thanks for your submission!',
      submitButtonText: 'Submit',
      fields: form.fields.map((f, i) => ({
        slug: f.name,
        label: formatLabel(f.name),
        fieldType: mapFieldType(f.type),
        placeholder: f.placeholder,
        isRequired: f.required,
        sortOrder: i,
        width: 'full',
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create form')
  }

  const data = await response.json()
  return data.id
}

// ============================================
// Widget Migration
// ============================================

async function migrateWidget(
  filePath: string,
  widget: any,
  options: MigrationOptions
): Promise<MigrationResult> {
  const changes: string[] = []

  if (options.dryRun) {
    changes.push(`[DRY RUN] Would remove ${widget.widgetType} script`)
    changes.push('[DRY RUN] Would enable Engage in SiteKitProvider')
    return { filePath, success: true, changes }
  }

  const fullPath = path.resolve(process.cwd(), filePath)
  let content = await fs.readFile(fullPath, 'utf-8')

  // Remove the widget script based on type
  switch (widget.widgetType) {
    case 'intercom':
      content = content.replace(/<Script[^>]*intercom[^>]*\/?>(?:<\/Script>)?/gi, '{/* Intercom replaced with Uptrade Engage */}')
      content = content.replace(/window\.Intercom\s*=\s*[^;]+;/g, '')
      break
    case 'crisp':
      content = content.replace(/<Script[^>]*crisp[^>]*\/?>(?:<\/Script>)?/gi, '{/* Crisp replaced with Uptrade Engage */}')
      break
    case 'drift':
      content = content.replace(/<Script[^>]*drift[^>]*\/?>(?:<\/Script>)?/gi, '{/* Drift replaced with Uptrade Engage */}')
      break
  }

  await fs.writeFile(fullPath, content, 'utf-8')
  changes.push(`Removed ${widget.widgetType} script`)
  changes.push('Enable Engage in SiteKitProvider to add chat widget')

  return { filePath, success: true, changes }
}

// ============================================
// Helpers
// ============================================

function generateSlug(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/form$/i, '')
    .replace(/-+/g, '-')
    .replace(/-$/, '') || 'form'
}

function formatName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function mapFieldType(type: string): string {
  const mapping: Record<string, string> = {
    'text': 'text',
    'email': 'email',
    'tel': 'phone',
    'phone': 'phone',
    'number': 'number',
    'textarea': 'textarea',
    'select': 'select',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'date': 'date',
    'file': 'file',
    'url': 'url',
    'password': 'text', // Don't use password for managed forms
  }
  return mapping[type] || 'text'
}

function detectFormType(form: DetectedForm): string {
  const name = form.componentName.toLowerCase()
  const fields = form.fields.map(f => f.name.toLowerCase()).join(' ')

  if (name.includes('contact') || fields.includes('message')) return 'contact'
  if (name.includes('newsletter') || name.includes('subscribe')) return 'newsletter'
  if (name.includes('quote') || name.includes('estimate')) return 'prospect'
  if (name.includes('support') || name.includes('help')) return 'support'
  if (name.includes('feedback')) return 'feedback'

  return 'contact'
}
