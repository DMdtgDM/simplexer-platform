import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Noto_Sans_Ethiopic } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/components/LocaleProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});
const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-ethiopic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Simplexer — All Subjects Is Our Aim',
  description:
    'Bilingual (Amharic/English) learning platform for Ethiopia — Grade 9 to university, plus interest-based skills courses.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3A8A',
};

// Runs before React hydrates so the page never flashes the wrong theme.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('simplexer_theme') || 'system';
    var dark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${notoEthiopic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body antialiased dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          <LocaleProvider>
            <Navbar />
            <main className="mx-auto min-h-[70vh] max-w-5xl px-4 pb-20 pt-4 sm:pb-8">{children}</main>
            <Footer />
            <BottomNav />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
