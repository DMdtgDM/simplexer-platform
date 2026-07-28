import {
  Atom,
  FlaskConical,
  Sigma,
  BookOpen,
  Leaf,
  Code,
  Languages,
  Wallet,
  Palette,
  GraduationCap,
  Compass,
  Send,
  MessageCircle,
  Youtube,
  Link as LinkIcon,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  atom: Atom,
  'flask-conical': FlaskConical,
  sigma: Sigma,
  'book-open': BookOpen,
  leaf: Leaf,
  code: Code,
  languages: Languages,
  wallet: Wallet,
  palette: Palette,
  send: Send,
  'message-circle': MessageCircle,
  youtube: Youtube,
  link: LinkIcon,
};

export function iconFor(name: string | null, fallback: LucideIcon = BookOpen): LucideIcon {
  if (!name) return fallback;
  return ICONS[name] ?? fallback;
}

export { GraduationCap, Compass };
