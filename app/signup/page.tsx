import { getGrades } from '@/lib/queries/grades';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Sign up — Simplexer' };

export default async function SignupPage() {
  const grades = await getGrades();
  return (
    <div className="mx-auto max-w-sm pt-8">
      <SignupForm grades={grades} />
    </div>
  );
}
