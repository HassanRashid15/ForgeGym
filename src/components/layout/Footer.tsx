"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Instagram, Facebook, Twitter, Youtube, MapPin, Phone, Mail } from "lucide-react";
import { useTheme } from "next-themes";

const footerLinks = [
  { name: "Classes & Schedule", path: "/classes" },
  { name: "Membership Plans", path: "/membership" },
  { name: "Our Trainers", path: "/trainers" },
  { name: "About Us", path: "/about" },
];

const Footer = () => {
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <footer className="bg-card border-t border-border" suppressHydrationWarning>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4" suppressHydrationWarning>
              <img 
                src={theme === "light" ? "/navlogolight.png" : "/gym.png"} 
                alt="FORGE Gym" 
                className="w-32 h-12 object-contain"
              />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Transform your body and mind at Forge. Premium fitness facilities, expert trainers, and a community that pushes you to be your best.
            </p>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
                <Youtube className="w-5 h-5" />
              </a>
            </div>
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
                      pathname === link.path
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
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between text-muted-foreground">
                <span>Monday - Friday</span>
                <span>5am - 11pm</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Saturday</span>
                <span>6am - 10pm</span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Sunday</span>
                <span>7am - 9pm</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-xl mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>123 Fitness Street, Downtown</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span>info@forgegym.com</span>
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
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors" suppressHydrationWarning>
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
