import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Simplexer' };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm pt-8">
      <LoginForm />
    </div>
  );
}
