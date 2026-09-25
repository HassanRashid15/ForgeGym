import type { ReactNode } from "react";

type RegisterShellProps = {
  children: ReactNode;
};

/** Visual chrome for register: split image panel + form card. */
export function RegisterShell({ children }: RegisterShellProps) {
  return (
    <div className="box-border grid h-dvh w-full max-w-[100vw] overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left — Image Panel */}
      <aside className="relative hidden min-h-0 min-w-0 overflow-hidden lg:block">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="absolute inset-0 h-full w-full max-w-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        <div className="absolute inset-0 z-10 flex flex-col overflow-hidden p-8 xl:p-12">
          <div className="mb-8 shrink-0">
            <img src="/preloader_logo.png" alt="Forge Gym Logo" className="h-10 w-40 object-contain" />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
            <h2 className="mb-4 text-4xl font-bold leading-tight xl:text-5xl xl:leading-[3.5rem]">
              <span className="text-red-500">START</span>{" "}
              <span className="text-white">YOUR</span>
              <br />
              <span className="text-white">JOURNEY</span>{" "}
              <span className="text-red-500">TODAY.</span>
            </h2>
            <p className="mb-6 max-w-md text-sm text-zinc-300">
              Join partner gyms transforming training every day.
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
              {[
                "Free Membership Sign-up",
                "Personal Training Plans",
                "Progress Tracking Tools",
                "Community Challenges",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-red-500/70 bg-black/30 p-3.5 backdrop-blur-sm"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <p className="min-w-0 text-sm font-medium text-white">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right — Form Panel: scrollable, scrollbar hidden, top always reachable */}
      <section
        className={[
          "box-border min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-black",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        <div className="flex min-h-full flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="box-border mx-auto w-full max-w-[440px] overflow-x-hidden rounded-2xl border border-red-500/30 bg-zinc-900/50 p-5 shadow-2xl shadow-red-500/10 backdrop-blur-sm sm:p-7">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
