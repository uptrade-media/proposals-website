import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { create } from 'zustand'
import axios from 'axios'

// Mock auth store (simplified version for testing)
const createAuthStore = () => create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/.netlify/functions/auth-login', {
        email,
        password
      })
      
      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false
      })
      return { success: true }
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  verifySession: async () => {
    set({ isLoading: true })
    try {
      const response = await axios.get('/.netlify/functions/auth-verify')
      set({
        user: response.data.user,
        isAuthenticated: response.data.authenticated,
        isLoading: false
      })
      return response.data.authenticated
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      })
      return false
    }
  },

  logout: async () => {
    try {
      await axios.post('/.netlify/functions/auth-logout')
      set({
        user: null,
        isAuthenticated: false,
        error: null
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },

  clearError: () => set({ error: null })
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

describe('auth-store', () => {
  let useAuthStore

  beforeEach(() => {
    useAuthStore = createAuthStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useAuthStore())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle successful login', async () => {
    const mockUser = {
      userId: '123',
      email: 'test@example.com',
      role: 'client'
    }

    axios.post.mockResolvedValue({
      data: { user: mockUser }
    })

    const { result } = renderHook(() => useAuthStore())

    let loginResult
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password123')
    })

    expect(loginResult.success).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle failed login', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'Invalid credentials' }
      }
    })

    const { result } = renderHook(() => useAuthStore())

    let loginResult
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'wrong-password')
    })

    expect(loginResult.success).toBe(false)
    expect(loginResult.error).toBe('Invalid credentials')
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe('Invalid credentials')
  })

  it('should set loading state during login', async () => {
    let resolveLogin
    axios.post.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      })
    )

    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.login('test@example.com', 'password123')
    })

    // Should be loading immediately
    expect(result.current.isLoading).toBe(true)

    // Resolve the promise
    await act(async () => {
      resolveLogin({ data: { user: { userId: '123' } } })
      await waitFor(() => !result.current.isLoading)
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should verify valid session', async () => {
    const mockUser = {
      userId: '123',
      email: 'test@example.com',
      role: 'client'
    }

    axios.get.mockResolvedValue({
      data: {
        authenticated: true,
        user: mockUser
      }
    })

    const { result } = renderHook(() => useAuthStore())

    let isAuthenticated
    await act(async () => {
      isAuthenticated = await result.current.verifySession()
    })

    expect(isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle invalid session', async () => {
    axios.get.mockRejectedValue({
      response: { status: 401 }
    })

    const { result } = renderHook(() => useAuthStore())

    let isAuthenticated
    await act(async () => {
      isAuthenticated = await result.current.verifySession()
    })

    expect(isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should logout successfully', async () => {
    axios.post.mockResolvedValue({ data: { success: true } })

    const { result } = renderHook(() => useAuthStore())

    // Set authenticated state first
    act(() => {
      result.current.user = { userId: '123' }
      result.current.isAuthenticated = true
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBeNull()
    expect(axios.post).toHaveBeenCalledWith('/.netlify/functions/auth-logout')
  })

  it('should clear error', () => {
    const { result } = renderHook(() => useAuthStore())

    // Set error
    act(() => {
      useAuthStore.setState({ error: 'Some error' })
    })

    expect(result.current.error).toBe('Some error')

    // Clear error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle network errors gracefully', async () => {
    axios.post.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAuthStore())

    let loginResult
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password123')
    })

    expect(loginResult.success).toBe(false)
    expect(result.current.error).toBe('Login failed')
  })
})
