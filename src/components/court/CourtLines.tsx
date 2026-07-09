/**
 * Líneas esquemáticas de una pista de balonmano. Coordenadas 10 px/m.
 *  - completa: 40×20 m → viewBox 0 0 400 200
 *  - media:    20×20 m → viewBox 0 0 200 200 (una portería + su área)
 * Colores fijos (pista azul, líneas claras) para que el dibujo blanco resalte
 * en cualquier tema. Componente puro, reutilizable en editor y vista.
 */
export default function CourtLines({ half = false }: { half?: boolean }) {
  const W = half ? 200 : 400;
  const line = "rgba(255,255,255,0.55)";
  return (
    <g>
      <rect x={2} y={2} width={W - 4} height={196} rx={4} fill="#204a6b" stroke={line} strokeWidth={1.5} />
      <g fill="none" stroke={line} strokeWidth={1.4}>
        {/* Área de 6 m (izquierda) */}
        <path d="M 2,25 A 60,60 0 0 1 62,85 L 62,115 A 60,60 0 0 1 2,175" />
        {/* Línea de 9 m (discontinua) */}
        <path strokeDasharray="4 4" d="M 2,-5 A 90,90 0 0 1 92,85 L 92,115 A 90,90 0 0 1 2,205" />
        {/* Marca de 7 m */}
        <line x1={72} y1={95} x2={72} y2={105} />

        {/* Línea de centro: en media pista es el borde derecho */}
        <line x1={half ? W - 2 : 200} y1={2} x2={half ? W - 2 : 200} y2={198} />

        {!half && (
          <>
            <path d="M 398,25 A 60,60 0 0 0 338,85 L 338,115 A 60,60 0 0 0 398,175" />
            <path strokeDasharray="4 4" d="M 398,-5 A 90,90 0 0 0 308,85 L 308,115 A 90,90 0 0 0 398,205" />
            <line x1={328} y1={95} x2={328} y2={105} />
          </>
        )}
      </g>
      {/* Porterías */}
      <line x1={2} y1={85} x2={2} y2={115} stroke="#ff9f0a" strokeWidth={4} />
      {!half && <line x1={398} y1={85} x2={398} y2={115} stroke="#ff9f0a" strokeWidth={4} />}
    </g>
  );
}
