/// <reference types="vite/client" />

// Optionally, declare the specific vars you use for better autocomplete:
interface ImportMetaEnv {
  readonly VITE_DS_ACCOUNT_ID: string
  readonly VITE_DS_ROW94_TEMPLATE_ID: string
  readonly VITE_DS_MBFM_TEMPLATE_ID: string
  readonly VITE_DS_BRAND_ID?: string
  // add more VITE_* as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}