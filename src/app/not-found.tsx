import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/pagenotfound.png"
          alt="Gym background"
          fill
          priority
          quality={75}
          className="object-cover"
          sizes="100vw"
        />
        {/* <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" /> */}
      </div>

      {/* Preloader Logo - Top Left */}
      <div className="absolute top-10 left-10 z-20">
        <Link href="/">
          <Image
            src="/preloader_logo.png"
            alt="Forge Logo"
            width={120}
            height={48}
            priority
            className="h-12 w-auto"
          />
        </Link>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-4">
        <Image
          src="/images/pagenotfoundtextss.png"
          alt="Page Not Found"
          width={400}
          height={200}
          priority
          className="max-w-full h-auto"
          style={{ width: 'auto', height: 'auto' }}
        />

        <Link
          href="/"
          className="relative inline-block transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-600/40 active:scale-95"
        >
          <Image
            src="/images/pagenotfoundbutton.png"
            alt="Go Back Home"
            width={200}
            height={65}
            className="w-auto h-auto"
            priority
          />
        </Link>
      </div>
    </div>
  );
}
