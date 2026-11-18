import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../../lib/auth.jsx'
import { DataProvider } from '../../../lib/store.jsx'
import Landing from '../Landing.jsx'

describe('Landing smoke render (demo mode)', () => {
  it('renders the marketing landing page with hero and CTAs', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <Landing />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    )

    expect(
      screen.getByRole('heading', { name: /Learn the skills that shape tomorrow/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/Tech Tians Academy teaches the technology/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore our courses/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /How it works/i })).toBeInTheDocument()
  })

  it('switches the hero copy when a chapter is chosen', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <DataProvider>
            <Landing />
          </DataProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: 'SECURITY' }))
    expect(
      await screen.findByRole('heading', { name: /Defend what others build/i }, { timeout: 2000 })
    ).toBeInTheDocument()
  })
})
