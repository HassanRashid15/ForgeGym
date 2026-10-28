"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Mail } from "lucide-react";
import { useTheme } from "next-themes";

const footerLinks = [
  { name: "Gyms", path: "/gyms" },
  { name: "Home", path: "/" },
  { name: "Our Trainers", path: "/trainers" },
  { name: "Exercises", path: "/exercises" },
  { name: "Blog", path: "/blog" },
  { name: "About Us", path: "/about" },
];

const Footer = () => {
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <footer className="bg-card border-t border-border" suppressHydrationWarning>
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4" suppressHydrationWarning>
              <img 
                src={theme === "light" ? "/forge_white.png" : "/preloader_logo.png"} 
                alt="FORGE Gym" 
                className="w-32 h-12 object-contain"
              />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Transform your body and mind at Forge. Partner gyms, expert trainers, and a community that pushes you to be your best.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-xl mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    href={link.path}
                    suppressHydrationWarning
                    className={`text-sm transition-colors ${
                      (
                        link.path === "/"
                          ? pathname === "/"
                          : pathname === link.path ||
                            pathname.startsWith(`${link.path}/`)
                      )
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-display text-xl mb-4">Hours</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Partner gym hours vary by location.</li>
              <li>Check each gym&apos;s profile for opening times.</li>
              <li>
                Platform support: see{" "}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact
                </Link>
                .
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-xl mb-4">Contact</h4>
            <ul className="space-y-3">
              {/* <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>123 Fitness Street, Downtown</span>
              </li> */}
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <span>03349878525</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span>hassanrashid0018@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 Forge Gym. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Contact / support
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              About Forge
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
