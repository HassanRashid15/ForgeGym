import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SplashProvider } from "@/components/marketing/SplashProvider";
import { PublicTrafficBeacon } from "@/components/marketing/PublicTrafficBeacon";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_SEO_TITLE,
  getMetadataBase,
  jsonLdScript,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import type { Viewport } from "next";

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: SITE_SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "Forge Gym",
    "partner gyms",
    "gym near me",
    "personal trainers",
    "fitness membership",
    "gym management platform",
    "workout progress tracking",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon/forgefavicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon/forgefavicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_SEO_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SEO_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "fitness",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0D0D0D" },
    { media: "(prefers-color-scheme: light)", color: "#EF1111" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript([organizationJsonLd(), websiteJsonLd()])}
        />
        <script
          id="forge-splash-lock"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (location.pathname === '/') {
                    document.documentElement.classList.add('forge-splash-lock');
                    // Start splash images ASAP (before body / React).
                    function preload(href) {
                      if (document.querySelector('link[rel="preload"][href="' + href + '"]')) return;
                      var l = document.createElement('link');
                      l.rel = 'preload';
                      l.as = 'image';
                      l.href = href;
                      l.fetchPriority = 'high';
                      document.head.appendChild(l);
                    }
                    preload('/splash_img.png');
                    preload('/preloader_logo.png');
                    if (!document.getElementById('forge-instant-splash')) {
                      var s = document.createElement('div');
                      s.id = 'forge-instant-splash';
                      s.setAttribute(
                        'style',
                        'position:fixed;inset:0;z-index:10000;overflow:hidden;background:#0D0D0D;'
                      );
                      var bg = document.createElement('img');
                      bg.src = '/splash_img.png';
                      bg.alt = '';
                      bg.decoding = 'async';
                      bg.fetchPriority = 'high';
                      bg.setAttribute(
                        'style',
                        'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 28%;'
                      );
                      var logo = document.createElement('img');
                      logo.src = '/preloader_logo.png';
                      logo.alt = 'FORGE';
                      logo.decoding = 'async';
                      logo.fetchPriority = 'high';
                      logo.setAttribute(
                        'style',
                        'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(72vw,320px);height:auto;z-index:1;'
                      );
                      s.appendChild(bg);
                      s.appendChild(logo);
                      document.documentElement.appendChild(s);
                      document.addEventListener('DOMContentLoaded', function() {
                        var boot = document.getElementById('forge-ssr-splash');
                        if (boot && s.parentNode) s.parentNode.removeChild(s);
                      });
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          id="strip-extension-attributes"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var badAttrs = [
                  'data-pdffiller-skip',
                  'cz-shortcut-listen',
                  'data-gr-ext-installed',
                  'data-new-gr-c-s-check-loaded',
                  'data-grammarly-part',
                  'data-lt-installed'
                ];
                function clean() {
                  for (var i = 0; i < badAttrs.length; i++) {
                    var attr = badAttrs[i];
                    var elements = document.querySelectorAll('[' + attr + ']');
                    for (var j = 0; j < elements.length; j++) {
                      elements[j].removeAttribute(attr);
                    }
                  }
                }
                clean();
                if (typeof MutationObserver !== 'undefined') {
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && badAttrs.indexOf(m.attributeName) !== -1) {
                        if (m.target && m.target.hasAttribute && m.target.hasAttribute(m.attributeName)) {
                          m.target.removeAttribute(m.attributeName);
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: badAttrs
                  });
                  window.addEventListener('load', function() {
                    clean();
                    setTimeout(function() { observer.disconnect(); }, 3000);
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={[barlow.variable, barlowCondensed.variable, "font-sans", "antialiased"].join(
          " ",
        )}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <TooltipProvider>
                <SplashProvider>
                  <RegisterServiceWorker />
                  <PublicTrafficBeacon />
                  <Toaster />
                  <Sonner />
                  {children}
                </SplashProvider>
              </TooltipProvider>
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
