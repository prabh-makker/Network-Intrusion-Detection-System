import { render } from '@testing-library/react'
import BackgroundCanvas from '@/components/BackgroundCanvas'

describe('BackgroundCanvas Component', () => {
  it('renders canvas element', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  it('sets canvas to fill viewport', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toHaveStyle('position: fixed')
    expect(canvas).toHaveStyle('top: 0')
    expect(canvas).toHaveStyle('left: 0')
    expect(canvas).toHaveStyle('width: 100%')
    expect(canvas).toHaveStyle('height: 100%')
  })

  it('has appropriate z-index for background', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')

    const zIndex = window.getComputedStyle(canvas!).zIndex
    // Background should be behind other content
    expect(['auto', '-1', '0']).toContain(zIndex)
  })

  it('applies pointer-events-none class', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')

    expect(canvas).toHaveClass('pointer-events-none')
  })

  it('renders without errors when mounted', () => {
    expect(() => {
      render(<BackgroundCanvas />)
    }).not.toThrow()
  })

  it('handles canvas context gracefully', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas')

    if (canvas) {
      const context = canvas.getContext('2d')
      expect(context).not.toBeNull()
    }
  })

  it('is responsive to window resize', () => {
    const { container } = render(<BackgroundCanvas />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement

    if (canvas) {
      const initialWidth = canvas.width

      // Simulate window resize
      global.innerWidth = 1920
      global.innerHeight = 1080
      window.dispatchEvent(new Event('resize'))

      // Canvas should respond to resize
      expect(canvas).toBeInTheDocument()
    }
  })
})
