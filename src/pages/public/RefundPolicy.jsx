import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui.jsx'

// This policy mirrors the in-app refund flow: a refund must be requested, is
// reviewed by the finance team, and — once approved — the order and payment
// statuses are marked refunded. There is no public self-serve refund form; a
// request is raised by contacting support (or by an authorised admin on behalf
// of a student).
export default function RefundPolicy() {
  return (
    <div className="w-full bg-void min-h-screen pb-24">
      <section className="border-b border-white/10 bg-surface/50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">Legal</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-white">Refund Policy</h1>
          <p className="mt-3 text-sm text-muted">Last updated: [DATE]</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm leading-relaxed text-muted">
        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">1. Satisfaction window</h2>
          <p>
            We want you to be confident in your enrollment. You may request a refund within{' '}
            <span className="text-white">7 days</span> of your purchase, provided you have not
            accessed a substantial portion of the course content. After this window, refunds
            are reviewed on a case-by-case basis.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">2. How to request a refund</h2>
          <p>
            To request a refund, contact us at [SUPPORT EMAIL] or [PHONE] and include your order
            reference, the course name, and the reason for the request. A member of our finance
            team will review your request.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">3. Review and approval</h2>
          <p>
            Refund requests require finance-team approval. Once approved, your order and payment
            are marked as refunded in our system, and the refund is initiated back to the
            original payment method used at checkout.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">4. Timing</h2>
          <p>
            Approved refunds are typically processed within <span className="text-white">5–7 business days</span>{' '}
            of approval. The time for the amount to appear in your account depends on Razorpay
            and your bank/issuer.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">5. Non-refundable items</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Courses purchased with a promotional/free code are not eligible for cash refunds.</li>
            <li>Expenses already incurred for shipped materials or certificates, if any.</li>
            <li>Refunds requested after the 7-day window outside exceptional circumstances.</li>
          </ul>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">6. Contact</h2>
          <p>
            For any refund questions, contact [COMPANY LEGAL NAME] at [ADDRESS], [SUPPORT EMAIL],
            or [PHONE].
          </p>
        </div>

        <div className="pt-4">
          <Link to="/contact">
            <Button variant="secondary" size="md">
              <ArrowLeft className="h-4 w-4" /> Contact support
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
