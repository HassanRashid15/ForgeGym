import type { ReactNode } from "react";

type RegisterShellProps = {
  children: ReactNode;
};

/** Visual chrome for register: split image panel + form card. */
export function RegisterShell({ children }: RegisterShellProps) {
  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-2">
      {/* Left — Image Panel */}
      <aside className="hidden lg:flex flex-col relative overflow-hidden">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        <div className="absolute z-10 flex-col h-full p-10 xl:p-14">
          <div className="mb-8">
            <img src="/forge.png" alt="Forge Gym Logo" className="w-40 h-10 object-contain" />
          </div>
          <div className="max-w-full flex flex-col h-full justify-center">
            <div>
              <h2 className="text-5xl font-bold mb-4 !leading-[3.5rem]">
                <span className="text-red-500">START</span>{" "}
                <span className="text-white">YOUR</span>
                <br />
                <span className="text-white">JOURNEY</span>{" "}
                <span className="text-red-500">TODAY.</span>
              </h2>
              <p className="text-sm text-zinc-300 mb-6">
                Join thousands of members transforming their lives every day.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  "Free Membership Sign-up",
                  "Personal Training Plans",
                  "Progress Tracking Tools",
                  "Community Challenges",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-4 p-4 border border-red-500/70 rounded-xl bg-black/30 backdrop-blur-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />
                    <p className="text-[17px] font-medium text-white">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right — Form Panel */}
      <section className="flex flex-col items-center justify-center bg-black overflow-y-auto px-8 py-12 sm:px-12">
        <div className="w-full max-w-[600px] border border-red-500/30 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10">
          {children}
        </div>
      </section>
    </div>
  );
}
