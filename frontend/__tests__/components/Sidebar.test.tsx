import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '@/components/Sidebar'

// ---------------------------------------------------------------------------
// Mocks — inline factories, no outer-variable closures
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/dashboard'),
}))

jest.mock('@/context/ThemeContext', () => ({
  useTheme: jest.fn(() => ({ theme: 'dark', toggleTheme: jest.fn() })),
}))

jest.mock('@/lib/auth', () => ({
  removeToken: jest.fn(),
}))

HTMLCanvasElement.prototype.getContext = jest.fn(() => null)

// ---------------------------------------------------------------------------

describe('Sidebar Component', () => {
  it('renders sidebar container', () => {
    render(<Sidebar />)
    // Sidebar renders as <aside> → role complementary
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Sidebar />)
    const links = screen.queryAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('displays dashboard link', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('toggles sidebar on collapse button click', () => {
    const { container } = render(<Sidebar />)
    const collapseBtn = container.querySelector('.sidebar__collapse-btn')
    if (collapseBtn) {
      fireEvent.click(collapseBtn)
      expect(container.querySelector('.sidebar--collapsed')).toBeInTheDocument()
    }
  })

  it('contains alerts navigation', () => {
    render(<Sidebar />)
    expect(screen.getByText('Threat Alerts')).toBeInTheDocument()
  })

  it('contains map navigation', () => {
    render(<Sidebar />)
    expect(screen.getByText('Geo-IP Map')).toBeInTheDocument()
  })

  it('contains settings navigation', () => {
    render(<Sidebar />)
    expect(screen.getByText('System Config')).toBeInTheDocument()
  })
})
