import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

/**
 * Download Block (for reports, etc.)
 * Theme-compatible: Uses CSS custom properties
 */
export function DownloadBlock({ 
  title = 'Download Full Report',
  description,
  fileUrl,
  fileName = 'report.pdf'
}) {
  return (
    <div className="bg-[var(--glass-bg)] rounded-xl shadow-[var(--shadow-md)] border border-[var(--glass-border)] p-6 sm:p-8 my-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-2">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
        <a href={fileUrl} download={fileName}>
          <Button variant="outline" className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white font-bold w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </a>
      </div>
    </div>
  )
}

export default DownloadBlock
