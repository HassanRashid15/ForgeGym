"use client";

export function Capsule({
  label,
  selected,
  onClick,
  icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 border flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
        selected
          ? "bg-red-600 text-white border-red-500 shadow-[0_0_16px_rgba(239,17,17,0.4)] scale-[1.02]"
          : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}

export function CapsuleRow({
  options,
  selected,
  onSelect,
  icons,
}: {
  options: string[];
  selected: string | string[];
  onSelect: (val: string) => void;
  icons?: Record<string, React.ReactNode>;
}) {
  const isSelected = (v: string) =>
    Array.isArray(selected) ? selected.includes(v) : selected === v;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {options.map((opt) => (
        <Capsule
          key={opt}
          label={opt}
          selected={isSelected(opt)}
          onClick={() => onSelect(opt)}
          icon={icons?.[opt]}
        />
      ))}
    </div>
  );
}
