import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { create } from 'zustand'
import axios from 'axios'

// Mock projects store (simplified version for testing)
const createProjectsStore = () => create((set, get) => ({
  projects: [],
  proposals: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.get('/.netlify/functions/projects-list')
      set({
        projects: response.data.projects,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch projects',
        isLoading: false
      })
    }
  },

  fetchProposals: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.get('/.netlify/functions/proposals-list')
      set({
        proposals: response.data.proposals,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to fetch proposals',
        isLoading: false
      })
    }
  },

  createProject: async (projectData) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post('/.netlify/functions/projects-create', projectData)
      set(state => ({
        projects: [...state.projects, response.data.project],
        isLoading: false
      }))
      return { success: true, project: response.data.project }
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to create project',
        isLoading: false
      })
      return { success: false, error: error.response?.data?.error }
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.put(
        `/.netlify/functions/projects-update?id=${id}`,
        updates
      )
      set(state => ({
        projects: state.projects.map(p =>
          p.id === id ? response.data.project : p
        ),
        isLoading: false
      }))
      return { success: true, project: response.data.project }
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to update project',
        isLoading: false
      })
      return { success: false }
    }
  },

  acceptProposal: async (proposalId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await axios.post(
        `/.netlify/functions/proposals-accept`,
        { proposalId }
      )
      set(state => ({
        proposals: state.proposals.map(p =>
          p.id === proposalId ? { ...p, status: 'accepted' } : p
        ),
        projects: [...state.projects, response.data.project],
        isLoading: false
      }))
      return { success: true, project: response.data.project }
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Failed to accept proposal',
        isLoading: false
      })
      return { success: false }
    }
  }
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}))

describe('projects-store', () => {
  let useProjectsStore

  beforeEach(() => {
    useProjectsStore = createProjectsStore()
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    const { result } = renderHook(() => useProjectsStore())

    expect(result.current.projects).toEqual([])
    expect(result.current.proposals).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch projects successfully', async () => {
    const mockProjects = [
      global.testHelpers.createMockProject({ name: 'Project 1' }),
      global.testHelpers.createMockProject({ name: 'Project 2' })
    ]

    axios.get.mockResolvedValue({
      data: { projects: mockProjects }
    })

    const { result } = renderHook(() => useProjectsStore())

    await act(async () => {
      await result.current.fetchProjects()
    })

    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Project 1')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle fetch projects error', async () => {
    axios.get.mockRejectedValue({
      response: {
        data: { error: 'Unauthorized' }
      }
    })

    const { result } = renderHook(() => useProjectsStore())

    await act(async () => {
      await result.current.fetchProjects()
    })

    expect(result.current.projects).toEqual([])
    expect(result.current.error).toBe('Unauthorized')
    expect(result.current.isLoading).toBe(false)
  })

  it('should fetch proposals successfully', async () => {
    const mockProposals = [
      { id: '1', title: 'Proposal 1', status: 'pending' },
      { id: '2', title: 'Proposal 2', status: 'sent' }
    ]

    axios.get.mockResolvedValue({
      data: { proposals: mockProposals }
    })

    const { result } = renderHook(() => useProjectsStore())

    await act(async () => {
      await result.current.fetchProposals()
    })

    expect(result.current.proposals).toHaveLength(2)
    expect(result.current.proposals[0].title).toBe('Proposal 1')
  })

  it('should create project successfully', async () => {
    const newProject = global.testHelpers.createMockProject({
      name: 'New Project'
    })

    axios.post.mockResolvedValue({
      data: { project: newProject }
    })

    const { result } = renderHook(() => useProjectsStore())

    let createResult
    await act(async () => {
      createResult = await result.current.createProject({
        name: 'New Project',
        description: 'Test description'
      })
    })

    expect(createResult.success).toBe(true)
    expect(result.current.projects).toHaveLength(1)
    expect(result.current.projects[0].name).toBe('New Project')
  })

  it('should handle create project error', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { error: 'Validation failed' }
      }
    })

    const { result } = renderHook(() => useProjectsStore())

    let createResult
    await act(async () => {
      createResult = await result.current.createProject({})
    })

    expect(createResult.success).toBe(false)
    expect(result.current.error).toBe('Validation failed')
    expect(result.current.projects).toHaveLength(0)
  })

  it('should update project successfully', async () => {
    const existingProject = global.testHelpers.createMockProject({
      id: '123',
      name: 'Old Name'
    })

    const updatedProject = { ...existingProject, name: 'New Name' }

    axios.put.mockResolvedValue({
      data: { project: updatedProject }
    })

    const { result } = renderHook(() => useProjectsStore())

    // Set initial state
    act(() => {
      useProjectsStore.setState({ projects: [existingProject] })
    })

    let updateResult
    await act(async () => {
      updateResult = await result.current.updateProject('123', {
        name: 'New Name'
      })
    })

    expect(updateResult.success).toBe(true)
    expect(result.current.projects[0].name).toBe('New Name')
  })

  it('should accept proposal and create project', async () => {
    const mockProposal = {
      id: 'prop-123',
      title: 'Test Proposal',
      status: 'sent'
    }

    const mockProject = global.testHelpers.createMockProject({
      name: 'Test Proposal'
    })

    axios.post.mockResolvedValue({
      data: { project: mockProject }
    })

    const { result } = renderHook(() => useProjectsStore())

    // Set initial state
    act(() => {
      useProjectsStore.setState({ proposals: [mockProposal] })
    })

    let acceptResult
    await act(async () => {
      acceptResult = await result.current.acceptProposal('prop-123')
    })

    expect(acceptResult.success).toBe(true)
    expect(result.current.proposals[0].status).toBe('accepted')
    expect(result.current.projects).toHaveLength(1)
  })

  it('should set loading state correctly', async () => {
    let resolveProjects
    axios.get.mockReturnValue(
      new Promise((resolve) => {
        resolveProjects = resolve
      })
    )

    const { result } = renderHook(() => useProjectsStore())

    act(() => {
      result.current.fetchProjects()
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveProjects({ data: { projects: [] } })
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('should handle multiple projects in state', async () => {
    const project1 = global.testHelpers.createMockProject({
      id: '1',
      name: 'Project 1'
    })
    const project2 = global.testHelpers.createMockProject({
      id: '2',
      name: 'Project 2'
    })

    axios.get.mockResolvedValue({
      data: { projects: [project1, project2] }
    })

    const { result } = renderHook(() => useProjectsStore())

    await act(async () => {
      await result.current.fetchProjects()
    })

    expect(result.current.projects).toHaveLength(2)

    // Update one project
    axios.put.mockResolvedValue({
      data: { project: { ...project1, name: 'Updated Project 1' } }
    })

    await act(async () => {
      await result.current.updateProject('1', { name: 'Updated Project 1' })
    })

    expect(result.current.projects[0].name).toBe('Updated Project 1')
    expect(result.current.projects[1].name).toBe('Project 2') // Unchanged
  })
})
