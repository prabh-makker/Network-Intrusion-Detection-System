import { render } from '@testing-library/react'
import BackgroundCanvas from '@/components/BackgroundCanvas'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}))

jest.mock('@/context/ThemeContext', () => ({
  useTheme: jest.fn(() => ({ theme: 'dark' })),
}))

// Prevent requestAnimationFrame from looping in jsdom
beforeEach(() => {
  jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(0)
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

// Mock Three.js — avoids WebGL context requirement in jsdom
jest.mock('three', () => {
  const mockDispose = jest.fn()
  const mockFn = () => jest.fn()
  const vec3 = () => ({
    x: 0, y: 0, z: 0,
    normalize: jest.fn().mockReturnThis(),
    multiplyScalar: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
  })
  const geo = () => ({
    setAttribute: jest.fn(),
    setDrawRange: jest.fn(),
    setFromPoints: jest.fn().mockReturnThis(),
    attributes: {
      position: { array: new Float32Array(1800), needsUpdate: false },
      color:    { array: new Float32Array(1800), needsUpdate: false },
    },
    dispose: mockDispose,
  })
  return {
    Scene:               jest.fn(() => ({ add: jest.fn(), remove: jest.fn() })),
    PerspectiveCamera:   jest.fn(() => ({ position: { z: 0, x: 0, y: 0 }, aspect: 1, updateProjectionMatrix: jest.fn(), lookAt: jest.fn() })),
    WebGLRenderer:       jest.fn(() => ({ setSize: jest.fn(), setClearColor: jest.fn(), setPixelRatio: jest.fn(), render: jest.fn(), dispose: mockDispose })),
    BufferGeometry:      jest.fn(geo),
    BufferAttribute:     jest.fn(),
    ShaderMaterial:      jest.fn(() => ({ uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } }, dispose: mockDispose })),
    PointsMaterial:      jest.fn(() => ({ dispose: mockDispose })),
    Points:              jest.fn(() => ({ rotation: { y: 0, z: 0, x: 0 }, position: { z: 0, set: jest.fn() } })),
    LineBasicMaterial:   jest.fn(() => ({ dispose: mockDispose })),
    LineSegments:        jest.fn(() => ({})),
    Line:                jest.fn(() => ({ geometry: { dispose: mockDispose } })),
    Group:               jest.fn(() => ({ add: jest.fn(), remove: jest.fn(), children: [], rotation: { z: 0, x: 0 }, position: { z: 0, y: 0, set: jest.fn() } })),
    Vector3:             jest.fn(vec3),
    MeshBasicMaterial:   jest.fn(() => ({ opacity: 1, dispose: mockDispose })),
    Mesh:                jest.fn(() => ({ position: { set: jest.fn(), add: jest.fn() }, rotation: { z: 0, x: 0 }, lookAt: jest.fn(), rotateX: jest.fn(), material: { opacity: 1, dispose: mockDispose }, geometry: { dispose: mockDispose } })),
    CylinderGeometry:    jest.fn(() => ({ dispose: mockDispose })),
    PlaneGeometry:       jest.fn(() => ({ dispose: mockDispose })),
    AdditiveBlending:    2,
    DoubleSide:          2,
  }
})

// ---------------------------------------------------------------------------

describe('BackgroundCanvas Component', () => {
  it('renders canvas element', () => {
    const { container } = render(<BackgroundCanvas />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('applies fixed positioning via Tailwind className', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toHaveClass('fixed')
    expect(canvas).toHaveClass('inset-0')
    expect(canvas).toHaveClass('w-full')
    expect(canvas).toHaveClass('h-full')
  })

  it('has z-index 0 via inline style', () => {
    const { container } = render(<BackgroundCanvas />)
    expect(container.querySelector('canvas')).toHaveStyle({ zIndex: '0' })
  })

  it('applies pointer-events-none class', () => {
    const { container } = render(<BackgroundCanvas />)
    expect(container.querySelector('canvas')).toHaveClass('pointer-events-none')
  })

  it('renders without throwing', () => {
    expect(() => render(<BackgroundCanvas />)).not.toThrow()
  })

  it('returns null on /login', () => {
    const nav = require('next/navigation')
    nav.usePathname.mockReturnValue('/login')
    const { container } = render(<BackgroundCanvas />)
    expect(container).toBeEmptyDOMElement()
    nav.usePathname.mockReturnValue('/dashboard')
  })

  it('returns null on /', () => {
    const nav = require('next/navigation')
    nav.usePathname.mockReturnValue('/')
    const { container } = render(<BackgroundCanvas />)
    expect(container).toBeEmptyDOMElement()
    nav.usePathname.mockReturnValue('/dashboard')
  })
})
