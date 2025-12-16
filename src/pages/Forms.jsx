/**
 * Forms Page - Portal page for the forms module
 */

import { useState } from 'react'
import PortalLayout from '@/components/layout/PortalLayout'
import FormsManager from '@/components/forms/FormsManager'

export default function FormsPage() {
  return (
    <PortalLayout>
      <FormsManager />
    </PortalLayout>
  )
}
