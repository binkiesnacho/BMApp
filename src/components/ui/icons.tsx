/** Iconos de línea reutilizables (heredan color con currentColor). */

export function EditIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M13.5 7.5l3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** Pincel/dibujar (pizarra táctica): lápiz sobre un trazo. */
export function DrawIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16 19 9a1.9 1.9 0 0 0-2.7-2.7L9.5 13.2 8.7 16z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 20c1.6 0 1.6-2 3.2-2s1.6 2 3.2 2 1.6-2 3.2-2 1.6 2 3.2 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
