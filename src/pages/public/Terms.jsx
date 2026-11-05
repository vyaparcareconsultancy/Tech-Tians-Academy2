import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui.jsx'

export default function Terms() {
  return (
    <div className="w-full bg-void min-h-screen pb-24">
      <section className="border-b border-white/10 bg-surface/50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">Legal</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-white">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted">Last updated: [DATE]</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm leading-relaxed text-muted">
        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">1. Acceptance</h2>
          <p>
            By accessing or using the Tech Tians Academy Service, you agree to be bound by these
            Terms and our Privacy Policy. If you do not agree, please do not use the Service.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">2. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials
            and for all activity under your account. You must provide accurate registration
            information. [COMPANY LEGAL NAME] may suspend or terminate accounts that violate
            these Terms.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">3. Enrollments and payments</h2>
          <p>
            Course fees are one-time unless stated otherwise. Payments are processed securely via
            Razorpay. Your enrollment is confirmed only after a successful payment or a valid
            promotional/free enrollment. Refunds are governed by our Refund Policy.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">4. Acceptable use</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Do not share your account or course material with others.</li>
            <li>Do not attempt to access other users' data or the Service's infrastructure.</li>
            <li>Do not resell, copy, or redistribute course content or certificates.</li>
          </ul>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">5. Content and IP</h2>
          <p>
            All course content, software, design, and trademarks belong to [COMPANY LEGAL NAME]
            or its licensors. Your use of the Service does not transfer any ownership rights.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">6. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, [COMPANY LEGAL NAME] is not liable for
            indirect, incidental, or consequential damages arising out of your use of the
            Service. Our total liability is limited to the amount you paid for the relevant
            course in the 12 months before the claim.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">7. Changes and contact</h2>
          <p>
            We may update these Terms from time to time. Continued use after changes constitutes
            acceptance. Questions: [SUPPORT EMAIL] or [ADDRESS].
          </p>
        </div>

        <div className="pt-4">
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
