import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '../../components/ui.jsx'

export default function Contact() {
  return (
    <div className="w-full bg-void min-h-screen pb-24">
      <section className="border-b border-white/10 bg-surface/50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">Support</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-white">Contact Us</h1>
          <p className="mt-3 text-sm text-muted">
            We're here to help with enrollments, payments, and general enquiries.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-base p-6 space-y-3">
            <Mail className="h-6 w-6 text-brand" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Email</p>
            <a href="mailto:[SUPPORT EMAIL]" className="text-white font-medium transition hover:text-brand">
              [SUPPORT EMAIL]
            </a>
          </div>
          <div className="card-base p-6 space-y-3">
            <Phone className="h-6 w-6 text-brand" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Phone</p>
            <p className="text-white font-medium">[PHONE]</p>
          </div>
          <div className="card-base p-6 space-y-3">
            <MapPin className="h-6 w-6 text-brand" />
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Office</p>
            <p className="text-white font-medium leading-relaxed">[ADDRESS]</p>
          </div>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">What happens next</h2>
          <p className="text-sm text-muted leading-relaxed">
            We usually respond within 1–2 business days. For refund requests, please include your
            order reference so our finance team can review it quickly (see our Refund Policy).
          </p>
        </div>

        <div className="pt-2">
          <Link to="/courses">
            <Button variant="secondary" size="md">
              <ArrowLeft className="h-4 w-4" /> Back to courses
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
