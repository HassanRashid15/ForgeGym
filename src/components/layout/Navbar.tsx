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
import { Menu, X, LogOut, User, Settings, LayoutDashboard } from "lucide-react";
import ThemeToggle from "@/components/marketing/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { getNameInitials } from "@/lib/utils";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Gyms", path: "/gyms" },
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
          className={`pointer-events-auto w-full max-w-none origin-top rounded-none transition-[width,max-width,margin,padding,border-radius,background-color,border-color,backdrop-filter,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,border-radius,margin] ${
            scrolled || isOpen
              ? "border-b border-white/10 bg-black/40 backdrop-blur-md xl:mt-5 xl:w-[min(92%,72rem)] xl:rounded-full xl:border xl:border-white/10 xl:px-6 xl:shadow-lg xl:shadow-black/20"
              : "mt-0 border-b border-transparent bg-transparent backdrop-blur-none"
          } ${isOpen ? "!mt-0 !w-full !max-w-none !rounded-none !border-b !border-white/10 !px-0" : ""}`}
        >
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:h-20 sm:px-6">
            <div className="relative flex h-full w-full min-w-0 items-center justify-between gap-3">
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2"
                suppressHydrationWarning
                onClick={closeMenu}
              >
                <img
                  src={theme === "light" ? "/forge.png" : "/forge.png"}
                  alt="FORGE Gym"
                  className="h-10 w-28 object-contain sm:h-12 sm:w-32"
                />
              </Link>

              <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 lg:flex xl:gap-6">
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
                        : pathname === link.path ||
                            pathname.startsWith(`${link.path}/`)
                          ? "text-primary"
                          : ""
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle />
                {isAuthenticated ? (
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
                          <p className="text-xs leading-none capitalize text-muted-foreground">
                            {user?.role}
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
                        <Link href="/settings" className="cursor-pointer">
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
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size={scrolled ? "default" : "lg"}
                      asChild
                      className="transition-all duration-300"
                      suppressHydrationWarning
                    >
                      <Link href="/login" suppressHydrationWarning>
                        Sign In
                      </Link>
                    </Button>
                    <Button
                      variant="default"
                      size={scrolled ? "default" : "lg"}
                      asChild
                      className="transition-all duration-300"
                      suppressHydrationWarning
                    >
                      <Link href="/register" suppressHydrationWarning>
                        Join Now
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <ThemeToggle />
                <button
                  type="button"
                  className="p-2 text-foreground"
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
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu — full width, height follows content */}
      {isOpen && (
        <div
          className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-black lg:hidden sm:top-20"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col px-6 py-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`rounded-lg px-3 py-3 text-lg font-medium transition-colors ${
                    pathname === link.path
                      ? "bg-white/5 text-primary"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={closeMenu}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
              {isAuthenticated ? (
                <>
                  <div className="mb-1 flex items-center gap-3 px-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="text-sm font-semibold tracking-wide">
                        {getNameInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm font-medium text-white">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs capitalize text-white/50">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="justify-start text-white"
                    asChild
                  >
                    <Link href="/dashboard" onClick={closeMenu}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-white"
                    asChild
                  >
                    <Link href="/profile" onClick={closeMenu}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-white"
                    asChild
                  >
                    <Link href="/settings" onClick={closeMenu}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start text-destructive"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="w-full text-white"
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
