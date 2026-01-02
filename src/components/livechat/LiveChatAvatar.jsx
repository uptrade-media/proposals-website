// src/components/livechat/LiveChatAvatar.jsx
// Avatar for live chat visitors — now delegates to ContactAvatar for consistent styling
import ContactAvatar from '@/components/ui/ContactAvatar'

export function LiveChatAvatar({ 
  name, 
  size = 'md', 
  status = 'active',
  className 
}) {
  const contact = {
    name,
    contact_type: 'visitor',
    is_visitor: true
  }
  return (
    <ContactAvatar
      contact={contact}
      type="livechat"
      size={size}
      status={status === 'active' ? 'online' : status}
      isLiveChatActive={status === 'pending_handoff' || status === 'active'}
      className={className}
    />
  )
}

export default LiveChatAvatar
