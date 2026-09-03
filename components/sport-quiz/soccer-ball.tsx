import { Circle, Line, Polygon, Svg } from 'react-native-svg';

/**
 * A small two-colour soccer ball drawn as SVG — a body circle with the classic
 * central pentagon, five outer pentagons and radial seams. Used on the Sports
 * Legends puzzle plates. Colours are fully configurable (body / patch / seam), so
 * a single component covers every design variant. Default palette is design #10
 * ("Изумруд-стекло") which reads well on the dark neon-glass plates.
 */
function pentPoints(cx: number, cy: number, r: number, startDeg: number): Array<[number, number]> {
  return Array.from({ length: 5 }, (_, k) => {
    const a = ((startDeg + k * 72) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
}
const toStr = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

export function SoccerBall({
  size,
  body = '#06121A',
  patch = '#3BE3C8',
  line = '#06303A',
}: {
  size: number;
  body?: string;
  patch?: string;
  line?: string;
}) {
  const c = size / 2;
  const R = size * 0.46; // small margin so the stroke isn't clipped
  const sw = Math.max(0.8, size * 0.03);
  const r1 = R * 0.34;
  const cverts = pentPoints(c, c, r1, -90); // central pentagon, vertex up
  const r2 = R * 0.72;
  const r3 = R * 0.26;
  const outers = Array.from({ length: 5 }, (_, k) => {
    const am = -90 + (k + 0.5) * 72;
    const ox = c + r2 * Math.cos((am * Math.PI) / 180);
    const oy = c + r2 * Math.sin((am * Math.PI) / 180);
    return pentPoints(ox, oy, r3, am + 180);
  });

  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={R} fill={body} stroke={line} strokeWidth={sw + 0.4} />
      {/* radial seams from the central pentagon vertices to the rim */}
      {cverts.map(([vx, vy], i) => {
        const a = Math.atan2(vy - c, vx - c);
        return (
          <Line key={`s${i}`} x1={vx} y1={vy} x2={c + R * Math.cos(a)} y2={c + R * Math.sin(a)} stroke={line} strokeWidth={sw} />
        );
      })}
      {outers.map((pts, i) => (
        <Polygon key={`o${i}`} points={toStr(pts)} fill={patch} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
      ))}
      <Polygon points={toStr(cverts)} fill={patch} stroke={line} strokeWidth={sw} strokeLinejoin="round" />
      {/* faint silhouette ring so the ball reads on the dark plate */}
      <Circle cx={c} cy={c} r={R} fill="none" stroke="#43596C" strokeWidth={0.9} />
    </Svg>
  );
}
