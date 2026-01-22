/**
 * @uptrade/site-kit/forms
 * 
 * Managed forms with intelligent routing
 * 
 * === HEADLESS HOOK (Recommended for custom UI) ===
 * 
 *   import { useForm } from '@uptrade/site-kit/forms'
 * 
 *   const { fields, values, errors, setFieldValue, submit, isSubmitting } = useForm('contact')
 * 
 *   // Build your own UI with your own CSS
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); submit() }}>
 *       {fields.map(field => (
 *         <YourInput
 *           key={field.slug}
 *           {...field}
 *           value={values[field.slug]}
 *           error={errors[field.slug]}
 *           onChange={(val) => setFieldValue(field.slug, val)}
 *         />
 *       ))}
 *     </form>
 *   )
 * 
 * === FORMS API (Create/Update forms programmatically) ===
 * 
 *   import { formsApi, field } from '@uptrade/site-kit/forms'
 * 
 *   // Create a form
 *   const form = await formsApi.create({
 *     projectId: 'xxx',
 *     slug: 'contact-us',
 *     name: 'Contact Form',
 *     fields: [
 *       field.text('name', 'Name', { isRequired: true }),
 *       field.email('email', 'Email'),
 *       field.textarea('message', 'Message'),
 *     ]
 *   })
 * 
 *   // Add a field
 *   await formsApi.addField(form.id, field.phone('phone', 'Phone'))
 * 
 *   // Update a field
 *   await formsApi.updateField(form.id, 'name', { label: 'Full Name' })
 * 
 * === RSC COMPONENT (with optional default styles) ===
 * 
 *   import { ManagedForm } from '@uptrade/site-kit/forms'
 *   import '@uptrade/site-kit/forms/styles.css'  // Optional
 * 
 *   <ManagedForm formId="contact" projectId={projectId} />
 * 
 * === RENDER PROP (for custom UI with defaults) ===
 * 
 *   <ManagedForm formId="contact" projectId={projectId}>
 *     {({ fields, values, submit, setFieldValue }) => (
 *       <YourCustomForm ... />
 *     )}
 *   </ManagedForm>
 * 
 * === CSS CUSTOMIZATION ===
 * 
 *   Override CSS variables in your global styles:
 *   :root {
 *     --uptrade-primary: #your-brand-color;
 *     --uptrade-input-border: #your-border-color;
 *     --uptrade-btn-bg: #your-button-color;
 *   }
 */

// Forms API - for creating/updating forms programmatically
export { formsApi, configureFormsApi, field } from './formsApi'
export type { 
  Form, 
  FormField, 
  FormStep, 
  FormType, 
  FieldType, 
  CreateFormInput, 
  UpdateFormInput,
  FormsListOptions 
} from './formsApi'

// Headless hook - for complete UI control
export { useForm } from './useForm'
export type { UseFormOptions, UseFormReturn } from './useForm'

// RSC component - for quick implementation
export { ManagedForm } from './ManagedForm'
export { FormClient } from './FormClient'
export { FormField as FormFieldComponent } from './FormField'

// Tracking
export { useFormTracking } from './useFormTracking'

// Types (legacy, prefer types from formsApi)
export type { 
  ManagedFormConfig, 
  FormSubmission,
  FormField as FormFieldConfig,
} from './types'

