import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SplashProvider } from "@/components/marketing/SplashProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
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
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "Forge Gym",
    "gym management",
    "partner gyms",
    "personal trainers",
    "fitness membership",
    "gym near me",
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
    icon: [{ url: "/forge-mark.png", type: "image/png" }],
    apple: [{ url: "/forge-mark.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
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
                    if (!document.getElementById('forge-instant-splash')) {
                      var s = document.createElement('div');
                      s.id = 'forge-instant-splash';
                      s.setAttribute('style', 'position:fixed;inset:0;z-index:10000;background:#0D0D0D;');
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
