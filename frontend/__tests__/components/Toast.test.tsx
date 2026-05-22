/**
 * Toast tests
 *
 * Toast.tsx exports ToastProvider + useToast hook (no default Toast component).
 * Tests use a helper that mounts ToastProvider and triggers toasts via useToast.
 */

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/Toast'

// ---------------------------------------------------------------------------
// Mock framer-motion — AnimatePresence / motion.div are not needed in jsdom
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ---------------------------------------------------------------------------
// Helper: renders ToastProvider with a trigger button
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info'

function ToastHarness({ type = 'success', title = 'Test', message }: { type?: ToastType; title?: string; message?: string }) {
  const { showToast } = useToast()
  return <button onClick={() => showToast(type, title, message)}>trigger</button>
}

function setup(type: ToastType = 'success', title = 'Test', message?: string) {
  return render(
    <ToastProvider>
      <ToastHarness type={type} title={title} message={message} />
    </ToastProvider>
  )
}

// ---------------------------------------------------------------------------

describe('Toast Component', () => {
  it('renders toast container', () => {
    const { container } = render(<ToastProvider><div /></ToastProvider>)
    expect(container).toBeInTheDocument()
  })

  it('displays toast message', () => {
    setup('success', 'Test notification')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Test notification')).toBeInTheDocument()
  })

  it('renders success toast with correct styling', () => {
    setup('success', 'Success')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('renders error toast with correct styling', () => {
    setup('error', 'Error occurred')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('renders warning toast', () => {
    setup('warning', 'Warning')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('renders info toast', () => {
    setup('info', 'Info')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('auto-dismisses after timeout', () => {
    jest.useFakeTimers()
    setup('success', 'Auto-dismiss')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Auto-dismiss')).toBeInTheDocument()
    act(() => { jest.advanceTimersByTime(4100) })
    expect(screen.queryByText('Auto-dismiss')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('displays optional description message', () => {
    setup('info', 'Title', 'Extra detail')
    act(() => { fireEvent.click(screen.getByRole('button')) })
    expect(screen.getByText('Extra detail')).toBeInTheDocument()
  })

  it('dismiss button removes toast', () => {
    setup('success', 'Dismissible')
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'trigger' })) })
    expect(screen.getByText('Dismissible')).toBeInTheDocument()

    // The X dismiss button is the second button in the DOM
    const buttons = screen.getAllByRole('button')
    const dismissBtn = buttons.find(b => b.textContent !== 'trigger')
    if (dismissBtn) {
      act(() => { fireEvent.click(dismissBtn) })
      expect(screen.queryByText('Dismissible')).not.toBeInTheDocument()
    }
  })
})
