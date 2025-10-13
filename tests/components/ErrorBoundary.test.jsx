import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Helper to render with router
const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  it('should render children when there is no error', () => {
    renderWithRouter(
      <ErrorBoundary>
        <div data-testid="child-component">Child content</div>
      </ErrorBoundary>
    )

    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('should catch errors and display error UI', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument()
  })

  it('should display error heading', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByRole('heading', { name: /Something went wrong/i })
    ).toBeInTheDocument()
  })

  it('should show error message', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByText(/encountered an unexpected error/i)
    ).toBeInTheDocument()
  })

  it('should display reload button', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    expect(reloadButton).toBeInTheDocument()
  })

  it('should display go home button', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const homeButton = screen.getByRole('button', { name: /go to home/i })
    expect(homeButton).toBeInTheDocument()
  })

  it('should show contact support message', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(
      screen.getByText(/need help\?/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/admin@uptrademedia.com/i)
    ).toBeInTheDocument()
  })

  it('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Error details should be visible
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('should handle reload button click', () => {
    const reloadMock = vi.fn()
    delete window.location
    window.location = { reload: reloadMock }

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    reloadButton.click()

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should log error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error')

    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalled()
  })

  it('should display AlertTriangle icon', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check for the icon's SVG container
    const svgElements = document.querySelectorAll('svg')
    expect(svgElements.length).toBeGreaterThan(0)
  })

  it('should maintain error state after caught', () => {
    const { rerender } = renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    // Rerender without throwing
    rerender(
      <BrowserRouter>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </BrowserRouter>
    )

    // Should still show error UI (ErrorBoundary doesn't reset automatically)
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('should catch errors in deeply nested components', () => {
    const DeepComponent = () => {
      return (
        <div>
          <div>
            <div>
              <ThrowError shouldThrow={true} />
            </div>
          </div>
        </div>
      )
    }

    renderWithRouter(
      <ErrorBoundary>
        <DeepComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('should handle component info in error', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // ErrorBoundary should capture componentDidCatch info
    expect(console.error).toHaveBeenCalled()
  })

  it('should apply proper styling classes', () => {
    const { container } = renderWithRouter(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check for flex and center classes
    const errorContainer = container.querySelector('.flex')
    expect(errorContainer).toBeInTheDocument()
  })
})
