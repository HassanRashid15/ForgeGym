import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import SeoManager from "@/components/marketing/SeoManager";
import { SplashProvider } from "@/components/marketing/SplashProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Forge Gym - Transform Your Fitness Journey",
  description: "Unleash your potential at Forge Gym. State-of-the-art equipment, expert trainers, and a community that refuses to quit.",
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
          id="forge-splash-lock"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (location.pathname === '/') {
                    document.documentElement.classList.add('forge-splash-lock');
                    // Instant dark cover before React — logo fades in via SSR splash CSS
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
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <QueryProvider>
              <TooltipProvider>
                <SplashProvider>
                  <SeoManager />
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
