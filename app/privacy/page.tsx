export const metadata = { title: 'Privacy Policy — Simplexer' };

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none pt-4">
      <h1 className="font-heading">Privacy Policy</h1>
      <p>
        <em>Last updated: November 25, 2026</em>
      </p>
      <p>
        Simplexer (ሲምፕሌክሰር) is a learning and tutoring platform for students, parents, and
        tutors in Ethiopia. This page explains what information we collect when you use
        Simplexer, why we collect it, and the choices you have.
      </p>
      <h2 className="font-heading">Information we collect</h2>
      <p>
        <strong>Account information.</strong> When you create an account, we store your email
        address and a securely hashed password. If you sign in with Google, we receive your
        name, email address, and profile picture from Google.
      </p>
      <p>
        <strong>Profile and tutoring information.</strong> If you add profile details or apply
        to become a tutor, we store what you provide — for example your name, phone number,
        subjects, grades, and teaching area. If you send a tutoring request or post a job, we
        store the details of that request, such as subject, grade, area, and schedule.
      </p>
      <p>
        <strong>Learning activity.</strong> We save your lesson progress and quiz results so
        you can continue where you left off.
      </p>
      <h2 className="font-heading">How we use your information</h2>
      <p>
        We use your information to run your account, show your progress, match students and
        parents with tutors, and respond to your requests. Contact details in a tutoring
        request or job are kept private: a phone number is shared only with the tutor chosen
        for that job, so the two sides can arrange lessons.
      </p>
      <h2 className="font-heading">What we do not do</h2>
      <p>
        We do not sell your personal information. We do not share it with advertisers. Job
        postings shown publicly never include a phone number or other private contact detail.
      </p>
      <h2 className="font-heading">Cookies</h2>
      <p>
        We use cookies only to keep you signed in and to remember basic preferences such as
        your language. We do not use advertising or cross-site tracking cookies.
      </p>
      <h2 className="font-heading">Where your data is stored</h2>
      <p>
        Simplexer is hosted on Vercel and uses Supabase for accounts and database storage.
        These providers store and process data on our behalf under their own security and
        privacy commitments.
      </p>
      <h2 className="font-heading">Your choices</h2>
      <p>
        You can update most of your profile information from your account settings at any
        time. To ask us to delete your account and personal information, contact us using the
        details below and we will remove it.
      </p>
      <h2 className="font-heading">Contact us</h2>
      <p>
        Reach us on Telegram at{' '}
        <a href="https://t.me/simplexer101" target="_blank" rel="noreferrer">
          t.me/simplexer101
        </a>{' '}
        or by email at hello@simplexer.et.
      </p>
    </article>
  );
}
