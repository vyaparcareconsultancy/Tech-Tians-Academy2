import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Modal } from '../ui.jsx'

describe('Modal focus behaviour', () => {
  it('keeps focus inside an input while typing after the modal is open', async () => {
    render(
      <Modal open onClose={() => {}} title="Edit">
        <input data-testid="name-input" aria-label="Name" />
      </Modal>
    )
    const input = screen.getByTestId('name-input')

    // The modal auto-focuses its first field when it opens.
    await waitFor(() => expect(input).toHaveFocus())

    // Typing must not steal focus from the input (regression for the
    // cursor-jump bug where the modal re-focused on every keystroke).
    fireEvent.change(input, { target: { value: 'a' } })
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: 'ab' } })
    expect(input).toHaveFocus()
    expect(input.value).toBe('ab')
  })

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="t">
        <input />
      </Modal>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
