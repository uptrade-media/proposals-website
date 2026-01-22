import useProjectsStore from '@/lib/projects-store'

// Convenience hook to access the current project and common project actions
export function useProject() {
  return useProjectsStore((state) => ({
    currentProject: state.currentProject,
    setCurrentProject: state.setCurrentProject,
    projects: state.projects,
    fetchProject: state.fetchProject,
    fetchProjects: state.fetchProjects,
    isLoading: state.isLoading,
    error: state.error,
  }))
}
