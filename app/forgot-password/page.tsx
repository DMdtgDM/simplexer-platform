import { ForgotForm } from './ForgotForm';

export const metadata = { title: 'Reset password — Simplexer' };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm pt-8">
      <ForgotForm />
    </div>
  );
}
