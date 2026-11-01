import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShieldCheck, ShieldX, Loader2, Award, GraduationCap } from 'lucide-react'
import { Button } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'
import { certificatesApi } from '../../lib/api/certificates.js'

export default function VerifyCertificate() {
  const { certificateNo = '' } = useParams()
  const [status, setStatus] = useState('loading') // loading | valid | invalid | error
  const [cert, setCert] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    const no = String(certificateNo).trim()
    if (!no) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    certificatesApi
      .verifyCertificate(no)
      .then((row) => {
        if (!active) return
        if (row) {
          setCert(row)
          setStatus('valid')
        } else {
          setStatus('invalid')
        }
      })
      .catch((err) => {
        if (!active) return
        setStatus('error')
        setMessage(err?.message || 'Could not verify this certificate')
      })
    return () => {
      active = false
    }
  }, [certificateNo])

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-24">
      {status === 'loading' && (
        <div className="card-base glass w-full max-w-lg p-10 border border-white/10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
          <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted">Verifying certificate…</p>
        </div>
      )}

      {status === 'valid' && cert && (
        <div className="card-base glass w-full border border-gold/40 p-8 sm:p-10 shadow-[0_0_60px_rgba(255,214,0,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-gold shadow-glow-gold">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-white">Valid certificate</h1>
          <p className="mt-1 font-mono text-xs text-gold">{certificateNo}</p>

          <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-gold text-void shadow-glow">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-muted">This certifies that</p>
          <p className="mt-1 font-heading text-2xl font-bold text-white">{cert.studentName}</p>
          <p className="mx-auto mt-6 max-w-md text-sm text-muted">
            has successfully completed
          </p>
          <p className="mt-1 font-heading text-lg font-semibold text-brand">{cert.courseTitle}</p>
          <p className="mt-6 font-mono text-xs text-muted">
            Issued on {formatDate(cert.issuedAt)}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" asChild>
              <Link to="/courses">Browse courses</Link>
            </Button>
          </div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="card-base glass w-full max-w-lg p-10 border border-rose-500/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-500/40 bg-rose-500/10 text-rose-400">
            <ShieldX className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-white">Certificate not found</h1>
          <p className="mt-2 text-sm text-muted">
            No certificate matches <span className="font-mono text-white/80">{certificateNo}</span>. Please double-check the number in the verification link.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="card-base glass w-full max-w-lg p-10 border border-rose-500/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-500/40 bg-rose-500/10 text-rose-400">
            <Award className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-white">Verification unavailable</h1>
          <p className="mt-2 text-sm text-muted">{message || 'The verification service is temporarily unavailable.'}</p>
        </div>
      )}
    </div>
  )
}
