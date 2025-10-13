import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Send, 
  Reply, 
  MessageCircle, 
  Users, 
  Mail,
  MailOpen,
  Plus,
  Search,
  Loader2,
  Clock,
  CheckCircle2
} from 'lucide-react'
import useMessagesStore from '@/lib/messages-store'
import useProjectsStore from '@/lib/projects-store'
import useAuthStore from '@/lib/auth-store'

const Messages = () => {
  const { user } = useAuthStore()
  const { projects, fetchProjects } = useProjectsStore()
  const { 
    messages, 
    conversations,
    contacts,
    currentMessage,
    unreadCount,
    fetchMessages, 
    fetchConversations,
    fetchContacts,
    sendMessage,
    replyToMessage,
    markAsRead,
    formatMessageDate,
    isLoading, 
    error, 
    clearError 
  } = useMessagesStore()
  
  const [activeTab, setActiveTab] = useState('inbox')
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    subject: '',
    content: '',
    project_id: ''
  })
  const [replyContent, setReplyContent] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjects()
    fetchContacts()
    fetchConversations()
    fetchMessages()
  }, [fetchProjects, fetchContacts, fetchConversations, fetchMessages])

  const handleComposeFormChange = (field, value) => {
    setComposeForm(prev => ({
      ...prev,
      [field]: value
    }))
    
    if (error) {
      clearError()
    }
  }

  const resetComposeForm = () => {
    setComposeForm({
      recipient_id: '',
      subject: '',
      content: '',
      project_id: ''
    })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!composeForm.recipient_id || !composeForm.content) {
      return
    }
    
    const messageData = {
      ...composeForm,
      project_id: composeForm.project_id || null
    }
    
    const result = await sendMessage(messageData)
    
    if (result.success) {
      setIsComposeDialogOpen(false)
      resetComposeForm()
    }
  }

  const handleReply = async (messageId) => {
    if (!replyContent.trim()) return
    
    const result = await replyToMessage(messageId, replyContent)
    
    if (result.success) {
      setReplyContent('')
    }
  }

  const handleMessageClick = async (message) => {
    if (message.status === 'unread' && message.recipient_id === user?.id) {
      await markAsRead(message.id)
    }
  }

  const filteredMessages = messages.filter(message => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      message.subject?.toLowerCase().includes(searchLower) ||
      message.content.toLowerCase().includes(searchLower) ||
      message.sender_name.toLowerCase().includes(searchLower) ||
      message.recipient_name.toLowerCase().includes(searchLower)
    )
  })

  const getMessageStatusIcon = (message) => {
    if (message.recipient_id === user?.id) {
      // Received message
      return message.status === 'unread' ? (
        <Mail className="w-4 h-4 text-[#4bbf39]" />
      ) : (
        <MailOpen className="w-4 h-4 text-gray-400" />
      )
    } else {
      // Sent message
      return <CheckCircle2 className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-gray-600">Communicate with team members and clients</p>
        </div>
        <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]">
              <Plus className="w-4 h-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a message to a team member or client.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="recipient">To *</Label>
                <Select 
                  value={composeForm.recipient_id} 
                  onValueChange={(value) => handleComposeFormChange('recipient_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        <div className="flex flex-col">
                          <span>{contact.name}</span>
                          <span className="text-xs text-gray-500">{contact.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project">Project (Optional)</Label>
                <Select 
                  value={composeForm.project_id} 
                  onValueChange={(value) => handleComposeFormChange('project_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={composeForm.subject}
                  onChange={(e) => handleComposeFormChange('subject', e.target.value)}
                  placeholder="Message subject"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Message *</Label>
                <Textarea
                  id="content"
                  value={composeForm.content}
                  onChange={(e) => handleComposeFormChange('content', e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsComposeDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !composeForm.recipient_id || !composeForm.content}
                  className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox" className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Conversations</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Contacts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Messages List */}
          {isLoading && filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#4bbf39]" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No messages found' : 'No messages yet'}
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm 
                    ? "No messages match your search criteria."
                    : "Start a conversation by composing a new message."
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => setIsComposeDialogOpen(true)}
                    className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Compose Message
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <Card 
                  key={message.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    message.status === 'unread' && message.recipient_id === user?.id 
                      ? 'border-[#4bbf39] bg-[#4bbf39]/5' 
                      : ''
                  }`}
                  onClick={() => handleMessageClick(message)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {getMessageStatusIcon(message)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${
                                message.status === 'unread' && message.recipient_id === user?.id
                                  ? 'text-gray-900' 
                                  : 'text-gray-700'
                              }`}>
                                {message.recipient_id === user?.id 
                                  ? message.sender_name 
                                  : `To: ${message.recipient_name}`
                                }
                              </span>
                              {message.project_title && (
                                <Badge variant="outline" className="text-xs">
                                  {message.project_title}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatMessageDate(message.created_at)}
                            </span>
                          </div>
                          
                          <h4 className={`text-sm mb-1 ${
                            message.status === 'unread' && message.recipient_id === user?.id
                              ? 'font-semibold text-gray-900' 
                              : 'text-gray-800'
                          }`}>
                            {message.subject || '(no subject)'}
                          </h4>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reply section for expanded message */}
                    {currentMessage?.id === message.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Type your reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setReplyContent('')}
                            >
                              Cancel
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleReply(message.id)}
                              disabled={!replyContent.trim() || isLoading}
                              className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          {conversations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Start messaging with team members to see conversations here.
                </p>
                <Button 
                  onClick={() => setIsComposeDialogOpen(true)}
                  className="bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Conversation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Card 
                  key={conversation.partner_id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center text-white font-medium">
                          {conversation.partner_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">
                              {conversation.partner_name}
                            </span>
                            <div className="flex items-center space-x-2">
                              {conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="px-1 py-0 text-xs">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatMessageDate(conversation.latest_message.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.latest_message.is_from_partner ? '' : 'You: '}
                            {conversation.latest_message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts available</h3>
                <p className="text-gray-500 text-center">
                  No team members or contacts are available for messaging.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] rounded-full flex items-center justify-center text-white font-medium">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {contact.name}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {contact.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {contact.role}
                          </Badge>
                          {contact.company_name && (
                            <span className="text-xs text-gray-400">
                              {contact.company_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="w-full mt-3 bg-gradient-to-r from-[#4bbf39] to-[#39bfb0] hover:from-[#3da832] hover:to-[#2da89a]"
                      onClick={() => {
                        setComposeForm(prev => ({
                          ...prev,
                          recipient_id: contact.id.toString()
                        }))
                        setIsComposeDialogOpen(true)
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Messages
