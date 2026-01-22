/**
 * Messages IndexedDB Cache
 * 
 * Provides offline-first message loading with instant UI.
 * Messages load from cache immediately, then sync with server.
 * 
 * Stores:
 * - messages: Individual messages with conversation index
 * - conversations: Conversation metadata
 * - contacts: Contact info for offline display
 * - meta: Sync timestamps, cursors, settings
 */
import { openDB } from 'idb'

const DB_NAME = 'uptrade-messages'
const DB_VERSION = 2

// Lazy initialize database
let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
          messagesStore.createIndex('conversation', 'conversationId')
          messagesStore.createIndex('created', 'created_at')
          messagesStore.createIndex('recipient', 'recipient_id')
          messagesStore.createIndex('sender', 'sender_id')
        }

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
          convStore.createIndex('updated', 'updated_at')
          convStore.createIndex('type', 'thread_type')
        }

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' })
          contactsStore.createIndex('org', 'org_id')
          contactsStore.createIndex('name', 'name')
        }

        // Echo messages (separate store for AI conversations)
        if (!db.objectStoreNames.contains('echoMessages')) {
          const echoStore = db.createObjectStore('echoMessages', { keyPath: 'id' })
          echoStore.createIndex('created', 'created_at')
        }

        // Metadata store (cursors, sync timestamps, settings)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export const messagesCache = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId) {
    try {
      const db = await getDB()
      if (!conversationId) {
        // Return all messages sorted by created_at desc
        const all = await db.getAllFromIndex('messages', 'created')
        return all.reverse()
      }
      return db.getAllFromIndex('messages', 'conversation', conversationId)
    } catch (error) {
      console.error('[Cache] Failed to get messages:', error)
      return []
    }
  },

  /**
   * Get a single message by ID
   */
  async getMessage(id) {
    try {
      const db = await getDB()
      return db.get('messages', id)
    } catch (error) {
      console.error('[Cache] Failed to get message:', error)
      return null
    }
  },

  /**
   * Store messages (batch)
   */
  async putMessages(messages) {
    if (!messages?.length) return
    try {
      const db = await getDB()
      const tx = db.transaction('messages', 'readwrite')
      await Promise.all([
        ...messages.map(m => tx.store.put(normalizeMessage(m))),
        tx.done
      ])
    } catch (error) {
      console.error('[Cache] Failed to put messages:', error)
    }
  },

  /**
   * Store a single message
   */
  async putMessage(message) {
    if (!message?.id) return
    try {
      const db = await getDB()
      await db.put('messages', normalizeMessage(message))
    } catch (error) {
      console.error('[Cache] Failed to put message:', error)
    }
  },

  /**
   * Delete a message
   */
  async deleteMessage(id) {
    try {
      const db = await getDB()
      await db.delete('messages', id)
    } catch (error) {
      console.error('[Cache] Failed to delete message:', error)
    }
  },

  /**
   * Get messages newer than a timestamp (for sync)
   */
  async getMessagesSince(timestamp) {
    try {
      const db = await getDB()
      const range = IDBKeyRange.lowerBound(timestamp)
      return db.getAllFromIndex('messages', 'created', range)
    } catch (error) {
      console.error('[Cache] Failed to get messages since:', error)
      return []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Conversations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all conversations
   */
  async getConversations() {
    try {
      const db = await getDB()
      const all = await db.getAllFromIndex('conversations', 'updated')
      return all.reverse() // Most recent first
    } catch (error) {
      console.error('[Cache] Failed to get conversations:', error)
      return []
    }
  },

  /**
   * Get a single conversation
   */
  async getConversation(id) {
    try {
      const db = await getDB()
      return db.get('conversations', id)
    } catch (error) {
      console.error('[Cache] Failed to get conversation:', error)
      return null
    }
  },

  /**
   * Store conversations (batch)
   */
  async putConversations(conversations) {
    if (!conversations?.length) return
    try {
      const db = await getDB()
      const tx = db.transaction('conversations', 'readwrite')
      await Promise.all([
        ...conversations.map(c => tx.store.put(normalizeConversation(c))),
        tx.done
      ])
    } catch (error) {
      console.error('[Cache] Failed to put conversations:', error)
    }
  },

  /**
   * Store a single conversation
   */
  async putConversation(conversation) {
    if (!conversation?.id) return
    try {
      const db = await getDB()
      await db.put('conversations', normalizeConversation(conversation))
    } catch (error) {
      console.error('[Cache] Failed to put conversation:', error)
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Contacts
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all contacts
   */
  async getContacts() {
    try {
      const db = await getDB()
      return db.getAll('contacts')
    } catch (error) {
      console.error('[Cache] Failed to get contacts:', error)
      return []
    }
  },

  /**
   * Get a single contact
   */
  async getContact(id) {
    try {
      const db = await getDB()
      return db.get('contacts', id)
    } catch (error) {
      console.error('[Cache] Failed to get contact:', error)
      return null
    }
  },

  /**
   * Store contacts (batch)
   */
  async putContacts(contacts) {
    if (!contacts?.length) return
    try {
      const db = await getDB()
      const tx = db.transaction('contacts', 'readwrite')
      await Promise.all([
        ...contacts.map(c => tx.store.put(c)),
        tx.done
      ])
    } catch (error) {
      console.error('[Cache] Failed to put contacts:', error)
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Echo Messages
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all Echo messages
   */
  async getEchoMessages() {
    try {
      const db = await getDB()
      return db.getAllFromIndex('echoMessages', 'created')
    } catch (error) {
      console.error('[Cache] Failed to get Echo messages:', error)
      return []
    }
  },

  /**
   * Store Echo messages (batch)
   */
  async putEchoMessages(messages) {
    if (!messages?.length) return
    try {
      const db = await getDB()
      const tx = db.transaction('echoMessages', 'readwrite')
      await Promise.all([
        ...messages.map(m => tx.store.put(normalizeMessage(m))),
        tx.done
      ])
    } catch (error) {
      console.error('[Cache] Failed to put Echo messages:', error)
    }
  },

  /**
   * Add a single Echo message
   */
  async putEchoMessage(message) {
    if (!message?.id) return
    try {
      const db = await getDB()
      await db.put('echoMessages', normalizeMessage(message))
    } catch (error) {
      console.error('[Cache] Failed to put Echo message:', error)
    }
  },

  /**
   * Clear Echo messages
   */
  async clearEchoMessages() {
    try {
      const db = await getDB()
      await db.clear('echoMessages')
    } catch (error) {
      console.error('[Cache] Failed to clear Echo messages:', error)
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Metadata
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get last sync timestamp for a key
   */
  async getLastSync(key = 'messages') {
    try {
      const db = await getDB()
      const meta = await db.get('meta', `sync:${key}`)
      return meta?.timestamp
    } catch (error) {
      console.error('[Cache] Failed to get last sync:', error)
      return null
    }
  },

  /**
   * Set last sync timestamp
   */
  async setLastSync(key = 'messages') {
    try {
      const db = await getDB()
      await db.put('meta', { key: `sync:${key}`, timestamp: Date.now() })
    } catch (error) {
      console.error('[Cache] Failed to set last sync:', error)
    }
  },

  /**
   * Get a cursor for pagination
   */
  async getCursor(key) {
    try {
      const db = await getDB()
      const meta = await db.get('meta', `cursor:${key}`)
      return meta?.cursor
    } catch (error) {
      console.error('[Cache] Failed to get cursor:', error)
      return null
    }
  },

  /**
   * Set a cursor for pagination
   */
  async setCursor(key, cursor) {
    try {
      const db = await getDB()
      await db.put('meta', { key: `cursor:${key}`, cursor })
    } catch (error) {
      console.error('[Cache] Failed to set cursor:', error)
    }
  },

  /**
   * Get cached user ID (for offline operations)
   */
  async getUserId() {
    try {
      const db = await getDB()
      const meta = await db.get('meta', 'userId')
      return meta?.value
    } catch (error) {
      return null
    }
  },

  /**
   * Set cached user ID
   */
  async setUserId(userId) {
    try {
      const db = await getDB()
      await db.put('meta', { key: 'userId', value: userId })
    } catch (error) {
      console.error('[Cache] Failed to set user ID:', error)
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Clear all cached data (for logout)
   */
  async clear() {
    try {
      const db = await getDB()
      await Promise.all([
        db.clear('messages'),
        db.clear('conversations'),
        db.clear('contacts'),
        db.clear('echoMessages'),
        db.clear('meta'),
      ])
      console.log('[Cache] Cleared all data')
    } catch (error) {
      console.error('[Cache] Failed to clear:', error)
    }
  },

  /**
   * Get cache stats for debugging
   */
  async getStats() {
    try {
      const db = await getDB()
      const [messages, conversations, contacts, echoMessages] = await Promise.all([
        db.count('messages'),
        db.count('conversations'),
        db.count('contacts'),
        db.count('echoMessages'),
      ])
      const lastSync = await this.getLastSync()
      return {
        messages,
        conversations,
        contacts,
        echoMessages,
        lastSync: lastSync ? new Date(lastSync).toISOString() : null,
      }
    } catch (error) {
      console.error('[Cache] Failed to get stats:', error)
      return null
    }
  },

  /**
   * Check if cache has data
   */
  async hasData() {
    try {
      const db = await getDB()
      const count = await db.count('messages')
      return count > 0
    } catch (error) {
      return false
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize message fields for consistent storage
 */
function normalizeMessage(message) {
  return {
    ...message,
    // Ensure consistent field names
    sender_id: message.sender_id || message.senderId,
    recipient_id: message.recipient_id || message.recipientId,
    created_at: message.created_at || message.createdAt,
    read_at: message.read_at || message.readAt,
    thread_type: message.thread_type || message.threadType,
    // Derive conversation ID for indexing
    conversationId: getConversationId(message),
  }
}

/**
 * Normalize conversation fields
 */
function normalizeConversation(conversation) {
  return {
    ...conversation,
    updated_at: conversation.updated_at || conversation.lastMessageAt || new Date().toISOString(),
  }
}

/**
 * Generate a consistent conversation ID from a message
 */
function getConversationId(message) {
  if (message.conversationId) return message.conversationId
  if (message.thread_type === 'echo') return 'echo'
  
  // For direct messages, create consistent ID from sorted user IDs
  const ids = [message.sender_id, message.recipient_id].filter(Boolean).sort()
  return ids.join(':')
}

export default messagesCache
