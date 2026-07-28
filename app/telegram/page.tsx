import { redirect } from 'next/navigation';

// Kept as a redirect so old links/bookmarks to /telegram still work — the
// real page now lives at /community and lists every admin-added link
// (Telegram, Discord, resources), not just Telegram.
export default function TelegramRedirect() {
  redirect('/community');
}
