/**
 * Líneas esquemáticas de una pista de balonmano (40×20 m → viewBox 0 0 400 200,
 * 10 px/m). Componente puro (sin estado), reutilizable en la pizarra editable y
 * en la vista de solo lectura.
 */
export default function CourtLines() {
  return (
    <g>
      {/* Superficie + límite */}
      <rect
        x={2}
        y={2}
        width={396}
        height={196}
        rx={4}
        fill="var(--color-surface-2)"
        stroke="var(--color-label-2)"
        strokeWidth={1.5}
      />
      <g
        fill="none"
        stroke="var(--color-label-2)"
        strokeWidth={1.4}
        opacity={0.85}
      >
        {/* Línea de centro */}
        <line x1={200} y1={2} x2={200} y2={198} />

        {/* Áreas de 6 m */}
        <path d="M 2,25 A 60,60 0 0 1 62,85 L 62,115 A 60,60 0 0 1 2,175" />
        <path d="M 398,25 A 60,60 0 0 0 338,85 L 338,115 A 60,60 0 0 0 398,175" />

        {/* Líneas de 9 m (discontinuas) */}
        <path
          strokeDasharray="4 4"
          d="M 2,-5 A 90,90 0 0 1 92,85 L 92,115 A 90,90 0 0 1 2,205"
        />
        <path
          strokeDasharray="4 4"
          d="M 398,-5 A 90,90 0 0 0 308,85 L 308,115 A 90,90 0 0 0 398,205"
        />

        {/* Marcas de 7 m */}
        <line x1={72} y1={95} x2={72} y2={105} />
        <line x1={328} y1={95} x2={328} y2={105} />
      </g>

      {/* Porterías */}
      <line x1={2} y1={85} x2={2} y2={115} stroke="var(--color-brand)" strokeWidth={4} />
      <line x1={398} y1={85} x2={398} y2={115} stroke="var(--color-brand)" strokeWidth={4} />
    </g>
  );
}
