import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Noto_Sans_Ethiopic } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { LocaleProvider } from '@/components/LocaleProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { JsonLd } from '@/components/JsonLd';
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

const SITE_TITLE = 'Simplexer — Home Tutors & Lessons in Ethiopia';
const SITE_DESCRIPTION =
  'Find trusted home tutors in Addis Ababa and across Ethiopia, and learn school subjects and skills with step-by-step lessons in Amharic and English. የቤት መምህር እና ትምህርት በኢትዮጵያ።';

export const metadata: Metadata = {
  metadataBase: new URL('https://simplexer-platform.vercel.app'),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    'home tutor Ethiopia',
    'tutor Addis Ababa',
    'የቤት መምህር',
    'Ethiopian tutor',
    'maths tutor Ethiopia',
    'home tutoring Ethiopia',
    'learn in Amharic',
    'Ethiopian school lessons',
    'Simplexer',
  ],
  category: 'education',
  verification: { google: 'eHHnyvlcI-kNz7PCQ3YCc5xY3L1kYVG6sVDpa32VOA0' },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: 'Simplexer',
    type: 'website',
    locale: 'en_ET',
    url: '/',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Simplexer — home tutors and lessons in Ethiopia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og.jpg'],
  },
};

const SITE_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://simplexer-platform.vercel.app/#org',
      name: 'Simplexer',
      url: 'https://simplexer-platform.vercel.app/',
      logo: 'https://simplexer-platform.vercel.app/icon.png',
      email: 'hello@simplexer.et',
      description: SITE_DESCRIPTION,
      areaServed: { '@type': 'Country', name: 'Ethiopia' },
      sameAs: ['https://t.me/simplexeret', 'https://t.me/simplexer101'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://simplexer-platform.vercel.app/#site',
      name: 'Simplexer',
      url: 'https://simplexer-platform.vercel.app/',
      publisher: { '@id': 'https://simplexer-platform.vercel.app/#org' },
      inLanguage: ['en', 'am'],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://simplexer-platform.vercel.app/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
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
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${poppins.variable} ${notoEthiopic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-body antialiased dark:bg-gray-950 dark:text-gray-100">
        <JsonLd data={SITE_JSONLD} />
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
