import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import VerifyCertificate from '../VerifyCertificate.jsx'

describe('VerifyCertificate smoke render (demo mode)', () => {
  it('shows the invalid state when verifyCertificate returns null in demo mode', async () => {
    render(
      <MemoryRouter initialEntries={['/verify/TTA-NOPE']}>
        <Routes>
          <Route path="/verify/:certificateNo" element={<VerifyCertificate />} />
        </Routes>
      </MemoryRouter>
    )

    // In demo mode verifyCertificate() resolves to null, so the page must show
    // the "certificate not found" (invalid) state rather than an error.
    expect(await screen.findByText('Certificate not found')).toBeInTheDocument()
  })
})
