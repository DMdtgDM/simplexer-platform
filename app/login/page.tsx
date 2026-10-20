import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Simplexer' };

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="mx-auto max-w-sm pt-8">
      <LoginForm next={searchParams.next} />
    </div>
  );
}
