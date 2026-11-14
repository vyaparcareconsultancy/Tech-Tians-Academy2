import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
      screen.getByRole('heading', { name: /Master Modern Technology Skills/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/hands-on learning platform/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Explore Courses/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /How It Works/i })).toBeInTheDocument()
  })
})
