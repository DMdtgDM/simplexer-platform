import { ButtonLink } from '@/components/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-20 text-center">
      <p className="font-heading text-5xl font-bold text-primary">404</p>
      <p className="text-sm text-gray-500">This page doesn't exist — it may have moved or been removed.</p>
      <ButtonLink href="/" className="mt-2">
        Back to Home
      </ButtonLink>
    </div>
  );
}
