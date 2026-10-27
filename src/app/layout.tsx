import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { BreakpointProvider } from '@/context/BreakpointContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { DataProvider } from '@/context/DataContext';
import { LoginWall } from '@/components/auth/LoginWall';
import { ShellSwitch } from '@/components/shell/ShellSwitch';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { AUTH_COOKIE_NAME, getAuthGateStatus } from '@/lib/auth';
import { Breakpoint } from '@/types';

export const metadata: Metadata = {
  title: 'Song Radar — Indian Song Announcements, Premieres & Live Drops',
  description:
    'Live radar tracking Indian song announcements, scheduled premieres, and releases (including surprise drops) across Hindi, Tamil, Telugu, Punjabi, Malayalam, Kannada and Bengali.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Song Radar',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090a0f',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const authStatus = getAuthGateStatus(token);

  // If unauthenticated or failing closed: render ONLY LoginWall.
  // Absolutely no feed data, no DataProvider, no shell, no children in the HTML output.
  if (!authStatus.authenticated) {
    return (
      <html lang="en" className="dark density-compact" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans+Gurmukhi:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased min-h-screen bg-background text-foreground">
          <PwaRegister />
          <LoginWall failClosed={authStatus.failClosed} />
        </body>
      </html>
    );
  }

  // Server-side detection to prevent any layout flash for authenticated users
  const headerList = await headers();
  const cookieBp = cookieStore.get('mxm_breakpoint')?.value as Breakpoint | undefined;
  const userAgent = headerList.get('user-agent') || '';

  let initialBreakpoint: Breakpoint = 'desktop';

  if (cookieBp && ['mobile', 'tablet', 'desktop', 'wide'].includes(cookieBp)) {
    initialBreakpoint = cookieBp;
  } else if (/mobile|iphone|ipod|android.*mobile/i.test(userAgent)) {
    initialBreakpoint = 'mobile';
  } else if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) {
    initialBreakpoint = 'tablet';
  } else {
    initialBreakpoint = 'desktop';
  }

  return (
    <html lang="en" className="dark density-compact" suppressHydrationWarning>
      <head>
        {/* Google Fonts preconnect for Indic typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Malayalam:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans+Gurmukhi:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        <PwaRegister />
        <BreakpointProvider initialBreakpoint={initialBreakpoint}>
          <SettingsProvider>
            <DataProvider>
              <ShellSwitch>{children}</ShellSwitch>
            </DataProvider>
          </SettingsProvider>
        </BreakpointProvider>
      </body>
    </html>
  );
}
