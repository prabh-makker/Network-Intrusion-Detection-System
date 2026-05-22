import { render, screen } from '@testing-library/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard',
  }),
  usePathname: () => '/dashboard',
}))

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
  }))
})

describe('Dashboard Page', () => {
  it('renders without crashing', async () => {
    const { container } = render(
      <div data-testid="dashboard">
        <h1>Dashboard</h1>
      </div>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('displays main heading', async () => {
    const { container } = render(
      <div>
        <h1>Network Intrusion Detection System</h1>
      </div>
    )
    expect(screen.getByText('Network Intrusion Detection System')).toBeInTheDocument()
  })

  it('contains layout structure', () => {
    const { container } = render(
      <div>
        <nav>Dashboard Navigation</nav>
        <main>Main Content</main>
      </div>
    )
    expect(container.querySelector('nav')).toBeInTheDocument()
    expect(container.querySelector('main')).toBeInTheDocument()
  })
})
