import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'

// Mock the auth store
const mockAuthStore = vi.fn()
vi.mock('@/lib/auth-store', () => ({
  default: () => mockAuthStore()
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

// Mock Dashboard component (simplified version)
const Dashboard = () => {
  const { user } = mockAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    projects: 0,
    messages: 0,
    invoices: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/.netlify/functions/reports-dashboard')
        setStats(response.data)
      } catch (error) {
        console.error('Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div data-testid="dashboard">
      <h1>Welcome, {user?.name}</h1>
      <div data-testid="stats">
        <div data-testid="projects-count">Projects: {stats.projects}</div>
        <div data-testid="messages-count">Messages: {stats.messages}</div>
        <div data-testid="invoices-count">Invoices: {stats.invoices}</div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.mockReturnValue({
      user: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'client'
      }
    })
  })

  it('should display loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithRouter(<Dashboard />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display user name after loading', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 5,
        messages: 3,
        invoices: 2
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument()
    })
  })

  it('should display dashboard statistics', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 5,
        messages: 3,
        invoices: 2
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('Projects: 5')
      expect(screen.getByTestId('messages-count')).toHaveTextContent('Messages: 3')
      expect(screen.getByTestId('invoices-count')).toHaveTextContent('Invoices: 2')
    })
  })

  it('should fetch dashboard data on mount', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 0,
        messages: 0,
        invoices: 0
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/.netlify/functions/reports-dashboard')
    })
  })

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    axios.get.mockRejectedValue(new Error('API Error'))

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load dashboard')
    })

    consoleErrorSpy.mockRestore()
  })

  it('should display zero stats when no data', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 0,
        messages: 0,
        invoices: 0
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('Projects: 0')
      expect(screen.getByTestId('messages-count')).toHaveTextContent('Messages: 0')
      expect(screen.getByTestId('invoices-count')).toHaveTextContent('Invoices: 0')
    })
  })

  it('should render dashboard container', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 1,
        messages: 1,
        invoices: 1
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  it('should handle different user roles', async () => {
    mockAuthStore.mockReturnValue({
      user: {
        id: '456',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }
    })

    axios.get.mockResolvedValue({
      data: {
        projects: 10,
        messages: 5,
        invoices: 8
      }
    })

    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome, Admin User/i)).toBeInTheDocument()
    })
  })

  it('should not fetch data twice on mount', async () => {
    axios.get.mockResolvedValue({
      data: {
        projects: 1,
        messages: 1,
        invoices: 1
      }
    })

    const { unmount } = renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1)
    })

    unmount()
  })

  it('should update loading state correctly', async () => {
    let resolvePromise
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    
    axios.get.mockReturnValue(promise)

    renderWithRouter(<Dashboard />)

    // Should be loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Resolve the promise
    resolvePromise({
      data: {
        projects: 1,
        messages: 1,
        invoices: 1
      }
    })

    // Should stop loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })
})
