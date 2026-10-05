import Image from "next/image";
import Link from "next/link";

export default async function NotFound() {
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
      <div className="absolute top-4 left-4 z-20">
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
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-4">
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
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-white transition-all hover:bg-red-700 hover:scale-105 hover:shadow-2xl hover:shadow-red-600/30"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
