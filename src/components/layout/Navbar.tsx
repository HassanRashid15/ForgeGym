"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, Dumbbell, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { getNameInitials } from "@/lib/utils";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Gyms", path: "/gyms" },
  { name: "Classes", path: "/classes" },
  { name: "Equipment", path: "/equipment" },
  { name: "Membership", path: "/membership" },
  { name: "Trainers", path: "/trainers" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-background/95 backdrop-blur-lg border-b border-border shadow-lg shadow-primary/5" 
          : "bg-transparent border-b border-transparent"
      }`}
      suppressHydrationWarning
    >
      <div className="container mx-auto px-4">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-16" : "h-20"} relative`}>
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" suppressHydrationWarning>
            <img 
              src={theme === "light" ? "/navlogolight.png" : "/gym.png"} 
              alt="FORGE Gym" 
              className={`object-contain transition-all duration-300 ${scrolled ? "w-32 h-12" : "w-32 h-12"}`}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                suppressHydrationWarning
                className={`nav-link text-sm font-medium transition-colors ${
                  link.path === "/"
                    ? pathname === "/"
                      ? "text-primary"
                      : ""
                    : pathname === link.path || pathname.startsWith(`${link.path}/`)
                      ? "text-primary"
                      : ""
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA Button & Theme Toggle */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="text-xs font-semibold tracking-wide">
                        {getNameInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size={scrolled ? "default" : "lg"} asChild className="transition-all duration-300" suppressHydrationWarning>
                  <Link href="/login" suppressHydrationWarning>Sign In</Link>
                </Button>
                <Button variant="default" size={scrolled ? "default" : "lg"} asChild className="transition-all duration-300" suppressHydrationWarning>
                  <Link href="/register" suppressHydrationWarning>Join Now</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-fade-in bg-background/95 backdrop-blur-lg">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`text-lg font-medium py-2 ${
                    pathname === link.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 py-2 border-t border-border mt-4 pt-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="text-sm font-semibold tracking-wide">
                        {getNameInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="justify-start" asChild onClick={() => setIsOpen(false)}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" className="justify-start" asChild onClick={() => setIsOpen(false)}>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" className="justify-start" asChild onClick={() => setIsOpen(false)}>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button variant="ghost" className="justify-start text-destructive" onClick={() => { logout(); setIsOpen(false); }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="mt-4" asChild suppressHydrationWarning>
                    <Link href="/login" onClick={() => setIsOpen(false)} suppressHydrationWarning>Sign In</Link>
                  </Button>
                  <Button variant="default" className="mt-2" asChild suppressHydrationWarning>
                    <Link href="/register" onClick={() => setIsOpen(false)} suppressHydrationWarning>Join Now</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;