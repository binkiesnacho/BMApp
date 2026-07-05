"use client";

/** Control segmentado estilo iOS. */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "bg-[#48484a] text-label shadow-sm"
                : "text-label-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
