import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '../components/providers/QueryProvider';
import { ApolloClientProvider } from '../components/providers/ApolloProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ShinraFixture 2026 | FIFA World Cup',
    template: '%s | ShinraFixture 2026',
  },
  description: 'La plataforma definitiva para seguir el Mundial de Fútbol FIFA 2026. Resultados en vivo, fixture, estadísticas, predicciones y comunidad.',
  keywords: ['FIFA', 'World Cup 2026', 'Mundial 2026', 'Fixture', 'Football', 'Soccer', 'Predictions'],
  authors: [{ name: 'ShinraFixture' }],
  creator: 'ShinraFixture',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://shinrafixture.com',
    title: 'ShinraFixture 2026 | FIFA World Cup',
    description: 'La plataforma definitiva para seguir el Mundial 2026',
    siteName: 'ShinraFixture 2026',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShinraFixture 2026',
    description: 'La plataforma definitiva para el Mundial 2026',
    images: ['/og-image.jpg'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <ApolloClientProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  className: 'font-sans text-sm',
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-color)',
                  },
                }}
              />
            </ApolloClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
