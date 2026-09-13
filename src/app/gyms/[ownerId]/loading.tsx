export default function GymLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="h-[70vh] animate-pulse bg-zinc-900" />
      <div className="container mx-auto grid grid-cols-2 gap-px bg-zinc-800/40 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse bg-zinc-950" />
        ))}
      </div>
    </div>
  );
}
