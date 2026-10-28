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
import { Menu, X, LogOut, User, Settings, LayoutDashboard, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { formatRoleName, getNameInitials } from "@/lib/utils";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Gyms", path: "/gyms" },
  { name: "Trainers", path: "/trainers" },
  { name: "Exercises", path: "/exercises" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading, isSuperAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === "light";

  // Dark full-bleed heroes — keep light (white) nav chrome until user scrolls
  const darkHeroRoute =
    pathname === "/" ||
    pathname === "/gyms" ||
    pathname.startsWith("/gyms/") ||
    pathname === "/trainers" ||
    pathname.startsWith("/trainers/");
  const overDarkHero = darkHeroRoute && !scrolled && !isOpen;

  // Dark text / dark logo only when light theme AND not sitting on a dark hero
  const useDarkInk = isLightTheme && !overDarkHero;

  // Detail/hero pages need a solid nav bg at the top (floating pill still only after scroll)
  const forceNavBg =
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/gyms/") ||
    pathname.startsWith("/trainers/");
  const showNavBg = scrolled || isOpen || forceNavBg;
  const showFloatingChrome = scrolled && !isOpen;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
        suppressHydrationWarning
      >
        <div
          className={`pointer-events-auto w-full max-w-none origin-top rounded-none transition-[width,max-width,margin,padding,padding-left,padding-right,border-radius,background-color,border-color,backdrop-filter,box-shadow] duration-300 ease-out will-change-[width,border-radius,margin,padding] ${
            showNavBg
              ? useDarkInk
                ? "border-b border-border/80 bg-background/85 backdrop-blur-md"
                : "border-b border-white/10 bg-black/40 backdrop-blur-md"
              : "mt-0 border-b border-transparent bg-transparent backdrop-blur-none"
          } ${
            showFloatingChrome
              ? useDarkInk
                ? "xl:mt-5 xl:w-[min(92%,72rem)] xl:rounded-full xl:border xl:border-border/70 xl:px-6 xl:shadow-lg xl:shadow-black/10"
                : "xl:mt-5 xl:w-[min(92%,72rem)] xl:rounded-full xl:border xl:border-white/10 xl:px-6 xl:shadow-lg xl:shadow-black/20"
              : ""
          } ${
            isOpen
              ? useDarkInk
                ? "!mt-0 !w-full !max-w-none !rounded-none !border-b !border-border/80 !px-0"
                : "!mt-0 !w-full !max-w-none !rounded-none !border-b !border-white/10 !px-0"
              : ""
          }`}
        >
          <div className={`mx-auto flex h-16 w-full max-w-7xl items-center transition-all duration-500 ease-out ${showNavBg ? "px-4" : "px-0"} sm:h-20 ${showNavBg ? "sm:px-6" : "sm:px-0"}`}>
            <div className="relative flex h-full w-full min-w-0 items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`p-2 lg:hidden ${useDarkInk ? "text-foreground" : "text-white"}`}
                  onClick={() => setIsOpen((o) => !o)}
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
                <Link
                  href="/"
                  className="group flex shrink-0 items-center gap-2"
                  suppressHydrationWarning
                  onClick={closeMenu}
                >
                  {/* Light page: dark wordmark; dark hero/theme: white wordmark */}
                  <img
                    src={useDarkInk ? "/forge_white.png" : "/preloader_logo.png"}
                    alt="FORGE Gym"
                    className="h-10 w-28 object-contain sm:h-12 sm:w-32"
                  />
                </Link>
              </div>

              <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 lg:flex xl:gap-6">
                {navLinks.map((link) => {
                  const active =
                    link.path === "/"
                      ? pathname === "/"
                      : pathname === link.path ||
                        pathname.startsWith(`${link.path}/`);
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      suppressHydrationWarning
                      className={`nav-link text-sm font-medium transition-colors ${
                        active
                          ? "text-primary"
                          : useDarkInk
                            ? "text-foreground/75 hover:text-foreground"
                            : "text-white/80 hover:text-white"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                {isLoading ? (
                  <div className="h-9 w-9 rounded-full bg-primary/10 animate-pulse" />
                ) : isAuthenticated ? (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full"
                      >
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
                          <p className="text-sm font-medium leading-none">
                            {user?.name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {formatRoleName(user?.role, isSuperAdmin)}
                          </p>
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
                        <Link href="/profile?tab=settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="cursor-pointer text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : isAuthenticated === false ? (
                  <>
                    <Button
                      variant="ghost"
                      size={showNavBg ? "default" : "lg"}
                      asChild
                      className={`hidden transition-all duration-300 lg:inline-flex ${
                        useDarkInk
                          ? "text-foreground/80 hover:bg-primary/10 hover:text-primary"
                          : "text-white hover:bg-primary/15 hover:text-primary"
                      }`}
                      suppressHydrationWarning
                    >
                      <Link href="/login" suppressHydrationWarning>
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      variant="default"
                      size={showNavBg ? "default" : "lg"}
                      asChild
                      className="transition-all duration-300 hidden lg:inline-flex"
                      suppressHydrationWarning
                    >
                      <Link href="/register" suppressHydrationWarning>
                        Join Now
                      </Link>
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu — full width, height follows content */}
      {isOpen && (
        <div
          className={`fixed inset-x-0 top-16 z-50 border-b lg:hidden sm:top-20 ${
            useDarkInk || isLightTheme
              ? "border-border bg-background"
              : "border-white/10 bg-black"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col px-6 py-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const active =
                  link.path === "/"
                    ? pathname === "/"
                    : pathname === link.path;
                const lightMenu = useDarkInk || isLightTheme;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={`rounded-lg px-3 py-3 text-lg font-medium transition-colors ${
                      active
                        ? lightMenu
                          ? "bg-foreground/5 text-primary"
                          : "bg-white/5 text-primary"
                        : lightMenu
                          ? "text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
                          : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={closeMenu}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            <div
              className={`mt-4 flex flex-col gap-3 border-t pt-4 ${
                useDarkInk || isLightTheme ? "border-border" : "border-white/10"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : isAuthenticated ? (
                <Button
                  variant="ghost"
                  className={`justify-start text-destructive`}
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              ) : isAuthenticated === false ? (
                <>
                  <Button
                    variant="ghost"
                    className={`w-full transition-colors ${
                      useDarkInk || isLightTheme
                        ? "text-foreground hover:bg-primary/10 hover:text-primary"
                        : "text-white hover:bg-primary/15 hover:text-primary"
                    }`}
                    asChild
                    suppressHydrationWarning
                  >
                    <Link href="/login" onClick={closeMenu} suppressHydrationWarning>
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    asChild
                    suppressHydrationWarning
                  >
                    <Link
                      href="/register"
                      onClick={closeMenu}
                      suppressHydrationWarning
                    >
                      Join Now
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
