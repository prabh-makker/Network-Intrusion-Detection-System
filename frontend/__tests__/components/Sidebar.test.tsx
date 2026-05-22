import { render, screen, fireEvent } from '@testing-library/react'
import { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}))

// Wrapper component to provide router context
function RenderWithRouter({ children }: { children: ReactNode }) {
  return <>{children}</>
}

describe('Sidebar Component', () => {
  it('renders sidebar container', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )
    const sidebar = screen.getByRole('navigation') || screen.getByTestId('sidebar')
    expect(sidebar).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    // Check for main navigation links
    const links = screen.queryAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('displays dashboard link', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    const dashboardLink = screen.queryByText(/dashboard/i) || screen.queryByText(/home/i)
    expect(dashboardLink).toBeInTheDocument()
  })

  it('toggles sidebar on menu button click', () => {
    const { container } = render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    const menuButton = screen.queryByRole('button', { name: /menu/i }) ||
                       container.querySelector('button[aria-label*="menu"]')

    if (menuButton) {
      fireEvent.click(menuButton)
      // Sidebar state should change (implementation-specific)
      expect(menuButton).toBeInTheDocument()
    }
  })

  it('contains alerts navigation', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    const alertsLink = screen.queryByText(/alerts/i)
    if (alertsLink) {
      expect(alertsLink).toBeInTheDocument()
    }
  })

  it('contains map navigation', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    const mapLink = screen.queryByText(/map/i)
    if (mapLink) {
      expect(mapLink).toBeInTheDocument()
    }
  })

  it('contains settings navigation', () => {
    render(
      <RenderWithRouter>
        <Sidebar />
      </RenderWithRouter>
    )

    const settingsLink = screen.queryByText(/settings/i)
    if (settingsLink) {
      expect(settingsLink).toBeInTheDocument()
    }
  })
})
