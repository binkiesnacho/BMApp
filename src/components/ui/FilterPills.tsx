"use client";

import Link from "next/link";

export type PillOpt = { value: string; label: string };

/**
 * Filtro homogéneo de toda la app: pastillas (tabs) con scroll horizontal y
 * targets táctiles amplios. Cada vista construye sus URLs con `hrefFor` para
 * conservar el resto de parámetros.
 */
export default function FilterPills({
  options,
  value,
  hrefFor,
  ariaLabel,
}: {
  options: PillOpt[];
  value: string;
  hrefFor: (value: string) => string;
  ariaLabel?: string;
}) {
  if (options.length <= 1) return null;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            scroll={false}
            role="tab"
            aria-selected={active}
            className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-[14px] font-medium transition-[transform,background-color,color] duration-150 ease-out active:scale-95 ${
              active
                ? "bg-brand text-white shadow-[0_6px_16px_-8px_rgba(46,109,224,0.8)]"
                : "bg-surface-2 text-label-2 hover:text-label"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
