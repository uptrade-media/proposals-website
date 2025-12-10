import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Lock, Bell } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'

export default function UserProfile() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('security')

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <p className="text-[var(--text-secondary)]">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-primary)] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="glass"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Account Settings</h1>
          <p className="text-[var(--text-secondary)] mt-2">Manage your account and security preferences</p>
        </div>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)]">Profile Information</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  View and manage your account profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
                    <p className="text-lg text-[var(--text-primary)] mt-1">{user.email}</p>
                  </div>

                  {user.name && (
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Full Name</label>
                      <p className="text-lg text-[var(--text-primary)] mt-1">{user.name}</p>
                    </div>
                  )}

                  {user.company && (
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Company</label>
                      <p className="text-lg text-[var(--text-primary)] mt-1">{user.company}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Account Type</label>
                    <p className="text-lg text-[var(--text-primary)] mt-1 capitalize">{user.role || 'Client'}</p>
                  </div>

                  {user.googleId && (
                    <div>
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Sign-In Method</label>
                      <p className="text-lg text-[var(--text-primary)] mt-1">Google OAuth</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-[var(--glass-border)]">
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    To update your profile information, please contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)]">Security Settings</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl">
                  <p className="text-sm text-[var(--text-primary)]">
                    🔐 Your account is secured with {user.googleId ? 'Google Sign-In' : 'email and password'}. 
                    To change your password, use the "Forgot Password" option on the login page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)]">Notification Preferences</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl">
                  <p className="text-sm text-[var(--text-primary)]">
                    📧 Notification preferences will be available soon. You'll be able to choose how and when you receive updates about proposals, projects, and messages.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Email Notifications</p>
                      <p className="text-sm text-[var(--text-secondary)]">Receive email updates about proposals and projects</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Message Alerts</p>
                      <p className="text-sm text-[var(--text-secondary)]">Get notified when you receive new messages</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-[var(--glass-border)] rounded-xl opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">Weekly Reports</p>
                      <p className="text-sm text-[var(--text-secondary)]">Receive a weekly summary of activity</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
