import Link from 'next/link';
import { saveProfileSettings } from '@/lib/actions/people';
import { card, field, btn } from '@/components/Ui';
import type { UserProfile } from '@/lib/types';

export function ProfileSettings({ profile }: { profile: UserProfile | null }) {
  if (!profile) return null;
  return (
    <div className="mt-6 space-y-4 pb-8">
      <form action={saveProfileSettings} className={`${card} space-y-4`}>
        <h2 className="font-heading text-lg font-bold text-textneutral">Manage my profile</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-textneutral">Display name
            <input name="name" defaultValue={profile.name} maxLength={80} className={`${field} mt-1`} />
          </label>
          <label className="block text-sm text-textneutral">Phone number
            <input name="phone" inputMode="tel" defaultValue={profile.phone ?? ''} placeholder="09..." className={`${field} mt-1`} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-textneutral">I am a
            <select name="account_type" defaultValue={profile.account_type ?? 'student'} className={`${field} mt-1`}>
              <option value="student">Student</option><option value="parent">Parent</option>
            </select>
          </label>
          <label className="block text-sm text-textneutral">Who can see my profile
            <select name="visibility" defaultValue={profile.visibility ?? 'private'} className={`${field} mt-1`}>
              <option value="private">Only me (private)</option>
              <option value="public">Logged-in Simplexer users (shows my first name, grade and bio)</option>
            </select>
          </label>
        </div>

        <label className="block text-sm text-textneutral">Short bio (optional)
          <textarea name="bio" rows={3} maxLength={300} defaultValue={profile.bio ?? ''} placeholder="What you are studying or working towards" className={`${field} mt-1`} />
        </label>

        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <h3 className="font-heading text-sm font-bold text-textneutral">Notifications</h3>
          <label className="block text-sm text-textneutral">Telegram username (optional)
            <input name="telegram_username" defaultValue={profile.telegram_username ?? ''} placeholder="@yourname" className={`${field} mt-1`} />
          </label>
          <p className="mt-1 text-xs text-gray-500">We are connecting Telegram delivery — saving your username now means prize and job messages can reach you there as soon as it switches on.</p>
          <label className="mt-3 flex items-center gap-2 text-sm text-textneutral">
            <input type="checkbox" name="notify_jobs" defaultChecked={profile.notify_jobs ?? true} /> Tell me about tutor job matches and applications
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-textneutral">
            <input type="checkbox" name="notify_competitions" defaultChecked={profile.notify_competitions ?? true} /> Tell me about competition wins and prizes
          </label>
        </div>

        <p className="text-xs text-gray-500">Your email, phone and full name are never shown publicly. If you are under 18, we recommend keeping your profile private.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={btn}>Save changes</button>
          {profile.visibility === 'public' && <Link href={`/u/${profile.id}`} className="text-sm text-primary underline">View my public page</Link>}
        </div>
      </form>
      <div className={`${card} flex flex-wrap gap-x-5 gap-y-2 text-sm`}>
        <Link href="/notifications" className="font-medium text-primary underline">Notifications</Link>
        <Link href="/requests" className="font-medium text-primary underline">My requests</Link>
        <Link href="/profile/progress" className="font-medium text-primary underline">My progress</Link>
        <Link href="/profile/bookmarks" className="font-medium text-primary underline">Bookmarks</Link>
        <Link href="/tutors" className="font-medium text-primary underline">Find a tutor</Link>
        <Link href="/tutor" className="font-medium text-primary underline">Become a tutor</Link>
      </div>
    </div>
  );
}
