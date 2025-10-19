import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, User, Lock, Bell } from 'lucide-react'
import useAuthStore from '@/lib/auth-store'
import TwoFactorSettings from '@/components/TwoFactorSettings'

export default function UserProfile() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('security')

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and security preferences</p>
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
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  View and manage your account profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg text-gray-900 mt-1">{user.email}</p>
                  </div>

                  {user.name && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Full Name</label>
                      <p className="text-lg text-gray-900 mt-1">{user.name}</p>
                    </div>
                  )}

                  {user.company && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Company</label>
                      <p className="text-lg text-gray-900 mt-1">{user.company}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Type</label>
                    <p className="text-lg text-gray-900 mt-1 capitalize">{user.role || 'Client'}</p>
                  </div>

                  {user.googleId && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Sign-In Method</label>
                      <p className="text-lg text-gray-900 mt-1">Google OAuth</p>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-4">
                    To update your profile information, please contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <TwoFactorSettings userEmail={user.email} />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📧 Notification preferences will be available soon. You'll be able to choose how and when you receive updates about proposals, projects, and messages.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50 cursor-not-allowed">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive email updates about proposals and projects</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50 cursor-not-allowed">
                    <div>
                      <p className="font-medium text-gray-900">Message Alerts</p>
                      <p className="text-sm text-gray-600">Get notified when you receive new messages</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5" disabled />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50 cursor-not-allowed">
                    <div>
                      <p className="font-medium text-gray-900">Weekly Reports</p>
                      <p className="text-sm text-gray-600">Receive a weekly summary of activity</p>
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
