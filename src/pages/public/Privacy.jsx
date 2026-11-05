import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui.jsx'

export default function Privacy() {
  return (
    <div className="w-full bg-void min-h-screen pb-24">
      <section className="border-b border-white/10 bg-surface/50 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">Legal</p>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted">Last updated: [DATE]</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-6 text-sm leading-relaxed text-muted">
        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">1. Who we are</h2>
          <p>
            [COMPANY LEGAL NAME] ("we", "us", "our") operates the Tech Tians Academy
            learning platform at www.techtians.com ("the Service"). This policy explains
            what personal data we collect, why we collect it, and the choices you have.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">2. Data we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Account data: name, email address, phone number, role, and login credentials (managed securely).</li>
            <li>Learning data: course enrollment, batch/class participation, assignment and quiz submissions, and progress.</li>
            <li>Payment data: we do not store full card numbers. Payments are processed by Razorpay; we store only order references, amounts and status.</li>
            <li>Technical data: device type, browser, IP address, and usage logs used for security and performance.</li>
          </ul>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">3. How we use data</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide and operate the Service, including enrollment and class delivery.</li>
            <li>To process payments and issue verifiable certificates.</li>
            <li>To send service and transactional emails (announcements, results, approvals).</li>
            <li>To comply with legal obligations and protect the security of the Service.</li>
          </ul>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">4. Sharing</h2>
          <p>
            We do not sell personal data. We share data only with service providers needed to
            operate the Service (e.g. Supabase for hosting and auth, Razorpay for payments,
            Resend for email delivery), and only to the extent required for those services.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">5. Data retention</h2>
          <p>
            We keep personal data only as long as necessary for the purposes above and for legal
            record-keeping. You may request deletion of your account and associated data as set
            out in the "Your rights" section.
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">6. Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data, and you
            may object to or restrict certain processing. To exercise any of these rights,
            contact us at [SUPPORT EMAIL].
          </p>
        </div>

        <div className="card-base p-6 space-y-4">
          <h2 className="font-heading text-lg font-bold text-white">7. Contact</h2>
          <p>
            For any privacy questions, contact [COMPANY LEGAL NAME] at [ADDRESS], by email at
            [SUPPORT EMAIL], or by phone at [PHONE].
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
