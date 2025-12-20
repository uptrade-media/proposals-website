/**
 * EditUserDialog - Edit user access level, role, or project assignments
 */
import { useState, useEffect } from 'react'
import { Edit2, Loader2, Building2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORG_ROLES } from '../shared/RoleBadge'
import UserAvatar from '../shared/UserAvatar'

export default function EditUserDialog({ 
  open, 
  onOpenChange, 
  user,
  projects = [],
  onSubmit,
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    role: 'member',
    accessLevel: 'organization',
    projectIds: []
  })

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        role: user.role || 'member',
        accessLevel: user.access_level || 'organization',
        projectIds: user.projectMemberships?.map(pm => pm.project?.id).filter(Boolean) || []
      })
    }
  }, [user])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.(formData)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleProject = (projectId) => {
    setFormData(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }))
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-[var(--brand-primary)]" />
            Edit User Access
          </DialogTitle>
          <DialogDescription>
            Modify access level and permissions for this user.
          </DialogDescription>
        </DialogHeader>

        {/* User info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <UserAvatar
            name={user.contact?.name}
            email={user.contact?.email}
            src={user.contact?.avatar}
            size="md"
          />
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {user.contact?.name || user.contact?.email}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">{user.contact?.email}</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value) => handleChange('accessLevel', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-400" />
                    <span>Organization (Full Access)</span>
                  </div>
                </SelectItem>
                <SelectItem value="project">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                    <span>Project Only (Limited)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORG_ROLES).filter(([key]) => key !== 'owner').map(([key, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Project selection for project-level access */}
          {formData.accessLevel === 'project' && projects.length > 0 && (
            <div className="space-y-2">
              <Label>Project Assignments</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-[var(--glass-border)] rounded-lg p-2">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-[var(--glass-bg-hover)] cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.projectIds.includes(project.id)}
                      onCheckedChange={() => toggleProject(project.id)}
                    />
                    <span className="text-sm">{project.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (formData.accessLevel === 'project' && formData.projectIds.length === 0)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
