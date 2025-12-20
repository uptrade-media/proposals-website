/**
 * InviteUserDialog - Invite users to an organization or project
 * Supports organization-level and project-level access
 */
import { useState, useEffect } from 'react'
import { UserPlus, Loader2, Building2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ACCESS_LEVELS } from '../shared/AccessLevelBadge'
import { ORG_ROLES } from '../shared/RoleBadge'

export default function InviteUserDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  projects = [],
  organizationName = 'Organization',
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'member',
    accessLevel: 'organization',
    projectIds: []
  })

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

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: '',
        name: '',
        role: 'member',
        accessLevel: 'organization',
        projectIds: []
      })
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[var(--brand-primary)]" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Add a new user to {organizationName}. They'll receive an email to access the portal.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Access Level *</Label>
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
                    <div className="text-left">
                      <span className="font-medium">Organization</span>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Full access to all projects, billing & proposals
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="project">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                    <div className="text-left">
                      <span className="font-medium">Project Only</span>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        Limited to assigned projects only
                      </p>
                    </div>
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
              <Label>Assign to Projects *</Label>
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
              {formData.accessLevel === 'project' && formData.projectIds.length === 0 && (
                <p className="text-xs text-amber-500">
                  Select at least one project
                </p>
              )}
            </div>
          )}

          {formData.accessLevel === 'project' && projects.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)] italic">
              No projects available. Create a project first to add project-level users.
            </p>
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
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
