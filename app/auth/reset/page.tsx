import { ResetForm } from './ResetForm';

export const metadata = { title: 'Set a new password — Simplexer' };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm pt-8">
      <ResetForm />
    </div>
  );
}
