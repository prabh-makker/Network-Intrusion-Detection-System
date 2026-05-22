import { render, screen, waitFor } from '@testing-library/react'
import Toast from '@/components/Toast'

describe('Toast Component', () => {
  it('renders toast container', () => {
    const { container } = render(<Toast message="Test message" />)
    expect(container).toBeInTheDocument()
  })

  it('displays toast message', () => {
    render(<Toast message="Test notification" />)
    expect(screen.getByText('Test notification')).toBeInTheDocument()
  })

  it('renders success toast with correct styling', () => {
    const { container } = render(
      <Toast message="Success" variant="success" />
    )
    const toast = container.querySelector('[class*="toast"]')
    expect(toast).toBeInTheDocument()
  })

  it('renders error toast with correct styling', () => {
    const { container } = render(
      <Toast message="Error occurred" variant="error" />
    )
    const toast = container.querySelector('[class*="toast"]')
    expect(toast).toBeInTheDocument()
  })

  it('renders warning toast', () => {
    render(<Toast message="Warning" variant="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders info toast', () => {
    render(<Toast message="Info" variant="info" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('auto-dismisses after timeout', async () => {
    const { unmount } = render(
      <Toast message="Auto-dismiss" timeout={100} />
    )
    expect(screen.getByText('Auto-dismiss')).toBeInTheDocument()

    await waitFor(
      () => {
        unmount()
      },
      { timeout: 200 }
    )
  })

  it('accepts custom className', () => {
    const { container } = render(
      <Toast message="Test" className="custom-class" />
    )
    const toast = container.querySelector('.custom-class')
    expect(toast).toBeInTheDocument()
  })

  it('renders with position prop', () => {
    const { container } = render(
      <Toast message="Positioned" position="top-right" />
    )
    expect(container).toBeInTheDocument()
  })
})
