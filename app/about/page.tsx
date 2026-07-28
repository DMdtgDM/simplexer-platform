export const metadata = { title: 'About — Simplexer' };

export default function AboutPage() {
  return (
    <article className="prose prose-slate max-w-none pt-4">
      <h1 className="font-heading">About Simplexer</h1>
      <p>
        Simplexer (ሲምፕሌክሰር) is a bilingual learning platform built for students and self-learners
        in Ethiopia — from Grade 9 through university, and for anyone who wants to pick up a new
        skill outside the classroom.
      </p>
      <p>
        <strong>Our mission:</strong> "All Subjects Is Our Aim" — እንወቅ. We believe every student
        deserves organized, exam-relevant study material and a place to practice, track progress,
        and keep learning, all without burning through an entire data bundle.
      </p>
      <h2 className="font-heading">Why we started on Telegram</h2>
      <p>
        Before this website existed, Simplexer built its audience on Telegram — the app Ethiopian
        students already check every day. The website exists to do what Telegram structurally
        can&apos;t: organized browsing, auto-graded quizzes, and progress that&apos;s saved to your
        account.
      </p>
      <h2 className="font-heading">Two tracks, one platform</h2>
      <p>
        The <strong>Formal Track</strong> follows the way Ethiopian students already think about
        school: Grade → Subject → Topic → Lesson. The <strong>Interest Track</strong> is for
        everything else — programming, languages, personal finance — organized the way an online
        course platform works: Category → Course → Lesson. Both run on the same lesson and quiz
        engine under the hood.
      </p>
      <h2 className="font-heading">Get in touch</h2>
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
