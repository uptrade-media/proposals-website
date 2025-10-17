/**
 * ConfirmDialog - Reusable confirmation dialog for destructive actions
 * 
 * Usage:
 *   const [dialog, setDialog] = useState({ open: false, id: null })
 *   
 *   <Button onClick={() => setDialog({ open: true, id: item.id })}>
 *     Delete
 *   </Button>
 *   
 *   <ConfirmDialog
 *     open={dialog.open}
 *     onOpenChange={(open) => setDialog({ open, id: null })}
 *     title="Delete Item"
 *     description="Are you sure? This action cannot be undone."
 *     onConfirm={() => handleDelete(dialog.id)}
 *   />
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { Loader2 } from 'lucide-react'

export function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title = 'Are you sure?', 
  description = 'This action cannot be undone.',
  onConfirm,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false
}) {
  const handleConfirm = () => {
    onConfirm()
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' 
                : ''
            }
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConfirmDialog
