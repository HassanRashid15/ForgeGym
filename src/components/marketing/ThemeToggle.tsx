import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`relative ${isHomePage ? "hover:bg-white/10" : "hover:bg-black/10"}`}
    >
      <Sun className={`h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 ${isHomePage ? "dark:text-white text-white" : "dark:text-white text-foreground"}`} />
      <Moon className={`absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ${isHomePage ? "dark:text-yellow-300 text-white" : "dark:text-yellow-300 text-foreground"}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;
