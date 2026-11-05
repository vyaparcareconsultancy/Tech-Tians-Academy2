import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../lib/auth.jsx'
import Login from '../Login.jsx'

describe('Login smoke render (demo mode)', () => {
  it('renders the sign-in form and the demo access panel', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    // Demo access panels only show in demo mode.
    expect(screen.getByText('Demo Access')).toBeInTheDocument()
  })
})
