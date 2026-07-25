import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import { AuthSyncProvider } from '@/components/providers/auth-sync-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { GlobalErrorProvider } from '@/contexts/global-error-context';
import { SeasonProvider } from '@/contexts/season-context';
import { 
  SEO_CONFIG, 
  organizationJsonLd, 
  websiteJsonLd, 
  localBusinessJsonLd 
} from '@/lib/seo';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { SocketProvider } from '@/components/providers/socket-provider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  // Title Configuration - Optimized for Vietnamese SEO
  title: {
    default: 'Shop Bán Nick Liên Quân Uy Tín - Mua Acc LQ Giá Rẻ, Chất Lượng | SHOPACVN',
    template: '%s | SHOPACVN.COM - Bán Nick Liên Quân Uy Tín',
  },
  
  // Description - Target 130-155 chars
  description:
    'SHOPACVN.COM - Shop bán nick Liên Quân uy tín #1 Việt Nam. Mua acc Liên Quân giá rẻ, chất lượng, full tướng skin. Giao dịch tự động 24/7, bảo hành 100%.',
  
  // Keywords - Vietnamese Gaming Market Focus
  keywords: [
    // Primary Keywords - Liên Quân Mobile
    'bán nick liên quân',
    'mua nick liên quân',
    'shop acc liên quân uy tín',
    'nick liên quân giá rẻ',
    'acc liên quân mobile',
    'acc liên quân chính chủ',
    'mua acc liên quân giá rẻ',
    'shop nick lien quan',
    'tài khoản liên quân mobile',
    'acc liên quân vip',
    'nick lq giá rẻ',
    // Secondary Keywords
    'shop uy tín bán acc',
    'acc liên quân full tướng',
    'nick liên quân có skin',
    'shop acc game uy tín',
    'mua nick lq uy tín',
    'bán tài khoản liên quân',
    'acc lq chất lượng',
    'shop bán acc 24/7',
    'mua nick liên quân auto',
    'acc liên quân giá rẻ nhất',
    'nick lq full skin',
    'shop game uy tín việt nam',
    'mua bán nick game online',
    'acc liên quân bảo hành',
  ],
  
  // Authors and Publisher
  authors: [
    {
      name: SEO_CONFIG.brand.name,
      url: SEO_CONFIG.siteUrl,
    },
  ],
  creator: SEO_CONFIG.brand.name,
  publisher: SEO_CONFIG.brand.name,
  
  // Format Detection
  formatDetection: {
    email: true,
    address: false,
    telephone: true,
  },
  
  // Metadata Base for relative URLs
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  
  // Alternate Languages - Vietnamese
  alternates: {
    canonical: '/',
    languages: {
      'vi-VN': '/',
      'vi': '/',
    },
  },
  
  // Open Graph - Vietnamese Locale
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: SEO_CONFIG.brand.name,
    title: 'Shop Bán Nick Liên Quân Uy Tín #1 - Mua Acc LQ Giá Rẻ Chất Lượng',
    description:
      'SHOPACVN.COM - Shop bán nick Liên Quân Mobile uy tín nhất Việt Nam. Acc giá rẻ, chất lượng, full tướng full skin. Giao dịch tự động 24/7, bảo hành trọn đời.',
    images: [
      {
        //chưa có ảnh og
        url: '/images/banner_topup.jpg',
        width: 1200,
        height: 630,
        alt: 'SHOPACVN.COM - Shop Bán Nick Liên Quân Uy Tín, Acc Giá Rẻ Chất Lượng',
        type: 'image/jpeg',
      },
      {
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'SHOPACVN.COM Logo',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@shopacvn',
    creator: '@shopacvn',
    title: 'Shop Bán Nick Liên Quân Uy Tín - Mua Acc LQ Giá Rẻ | SHOPACVN',
    description:
      'Mua nick Liên Quân uy tín, acc giá rẻ, chất lượng cao. Giao dịch tự động 24/7, bảo hành 100%. Shop acc game #1 Việt Nam.',
    images: ['/images/banner_topup.jpg'],
  },
  
  // Robots Configuration
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verification - Add your actual codes
  verification: {
    google: 'your-google-verification-code', // TODO: Replace with actual code
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  
  // Category
  category: 'gaming',
  
  // App Info
  applicationName: SEO_CONFIG.brand.name,
  referrer: 'origin-when-cross-origin',
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/images/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  
  // Apple Web App
  appleWebApp: {
    capable: true,
    title: SEO_CONFIG.brand.name,
    statusBarStyle: 'black-translucent',
  },
  
  // Manifest
  manifest: '/manifest.webmanifest',
  
  // Other meta tags
  other: {
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=yes',
    'geo.region': 'VN',
    'geo.country': 'Vietnam',
    'content-language': 'vi',
    'og:locale:alternate': 'vi_VN',
  },
};

// Combined JSON-LD for global schema
function GlobalJsonLd() {
  const schemas = [
    organizationJsonLd(),
    websiteJsonLd(),
    localBusinessJsonLd(),
  ];
  
  return (
    <script
      id="global-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemas),
      }}
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for CDNs */}
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        
        {/* Alternate language */}
        <link rel="alternate" hrefLang="vi-VN" href={SEO_CONFIG.siteUrl} />
        <link rel="alternate" hrefLang="vi" href={SEO_CONFIG.siteUrl} />
        <link rel="alternate" hrefLang="x-default" href={SEO_CONFIG.siteUrl} />
        
        {/* Global JSON-LD */}
        <GlobalJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} antialiased min-h-screen bg-background transition-colors duration-300 overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <AuthSyncProvider>
                <SeasonProvider>
                  <SocketProvider>
                    <GlobalErrorProvider>
                      {children}
                      <Toaster />
                    </GlobalErrorProvider>
                  </SocketProvider>
                </SeasonProvider>
              </AuthSyncProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
