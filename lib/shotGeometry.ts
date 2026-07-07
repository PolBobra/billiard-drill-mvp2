// Общая геометрия бильярдного стола: используется и интерактивным столом,
// и просмотром сохранённого рисунка (только чтение).

export type Point = { x: number; y: number };

export const W = 800;
export const H = 400;
// границы, от которых отскакивает биток (внутренний край бортов)
export const BOUNDS = { minX: 14, maxX: W - 14, minY: 14, maxY: H - 14 };

export const POCKETS: Point[] = [
  { x: 20, y: 20 },
  { x: W / 2, y: 12 },
  { x: W - 20, y: 20 },
  { x: 20, y: H - 20 },
  { x: W / 2, y: H - 12 },
  { x: W - 20, y: H - 20 },
];

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
export function len(v: Point) {
  return Math.hypot(v.x, v.y);
}
export function norm(v: Point): Point {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}
export function rotate(v: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return {
    x: v.x * Math.cos(rad) - v.y * Math.sin(rad),
    y: v.x * Math.sin(rad) + v.y * Math.cos(rad),
  };
}
export function signedAngleDeg(v1: Point, v2: Point) {
  const cross = v1.x * v2.y - v1.y * v2.x;
  const dot = v1.x * v2.x + v1.y * v2.y;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}
export function categorizeDistance(px: number): 'close' | 'medium' | 'far' {
  if (px < 150) return 'close';
  if (px < 350) return 'medium';
  return 'far';
}
export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Приблизительное направление битка ПОСЛЕ контакта с прицельным шаром.
// null — прямой стан-удар (биток стоит на месте).
export function cueBallDirection(
  cue: Point,
  obj: Point,
  target: Point,
  spinAmt: number,
  englishAmt: number
): Point | null {
  const aim = norm(sub(obj, cue));
  const objectDir = norm(sub(target, obj));
  const along = aim.x * objectDir.x + aim.y * objectDir.y;
  const tangent = { x: aim.x - along * objectDir.x, y: aim.y - along * objectDir.y };
  const forward = { x: objectDir.x * spinAmt * 0.9, y: objectDir.y * spinAmt * 0.9 };
  const raw = { x: tangent.x + forward.x, y: tangent.y + forward.y };
  if (len(raw) < 0.02) return null;
  return norm(rotate(norm(raw), englishAmt * 12));
}

// Траектория битка с отскоками от бортов до заданной длины.
export function buildBouncePath(start: Point, dir: Point, length: number): Point[] {
  const pts: Point[] = [
    { x: clamp(start.x, BOUNDS.minX, BOUNDS.maxX), y: clamp(start.y, BOUNDS.minY, BOUNDS.maxY) },
  ];
  let pos = { ...pts[0] };
  let d = { ...dir };
  let remaining = length;

  for (let i = 0; i < 12 && remaining > 0.5; i++) {
    let tx = Infinity;
    let ty = Infinity;
    if (d.x > 1e-6) tx = (BOUNDS.maxX - pos.x) / d.x;
    else if (d.x < -1e-6) tx = (BOUNDS.minX - pos.x) / d.x;
    if (d.y > 1e-6) ty = (BOUNDS.maxY - pos.y) / d.y;
    else if (d.y < -1e-6) ty = (BOUNDS.minY - pos.y) / d.y;

    const tHit = Math.min(tx, ty);
    if (!isFinite(tHit) || tHit >= remaining) {
      pos = { x: pos.x + d.x * remaining, y: pos.y + d.y * remaining };
      pts.push({ ...pos });
      break;
    }
    pos = { x: pos.x + d.x * tHit, y: pos.y + d.y * tHit };
    pts.push({ ...pos });
    if (Math.abs(tHit - tx) < 1e-4) d = { x: -d.x, y: d.y };
    if (Math.abs(tHit - ty) < 1e-4) d = { x: d.x, y: -d.y };
    remaining -= tHit;
  }
  return pts;
}

export function polylineLength(pts: Point[]) {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += len(sub(pts[i + 1], pts[i]));
  return total;
}

export function pointToSeg(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby || 1;
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2;
  t = clamp(t, 0, 1);
  return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}
export function distToPolyline(p: Point, pts: Point[]): number {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, pointToSeg(p, pts[i], pts[i + 1]));
  return m;
}

export type ShotDiagram = {
  cueBall: Point;
  objectBall: Point;
  positionBall: Point | null;
  englishOffset: number; // -1..1, боковой винт (лево/право)
  spinOffset: number; // -1..1, верх/низ (накат/оттяжка)
  intended: Point;
  actual: Point;
  intendedAngle: number;
  actualAngle: number;
  deviation: number;
  suggestedError: 'недокрут' | 'перекрут' | null;
  distance: 'close' | 'medium' | 'far';
  distancePx: number;
  cuePath?: Point[]; // нарисованная вручную траектория битка после удара
};

// Сегменты зоны с затуханием — общий расчёт для стола и просмотра.
export function zoneSegments(
  d: Pick<ShotDiagram, 'cueBall' | 'objectBall' | 'intended' | 'spinOffset' | 'englishOffset'>
): { segments: { x1: number; y1: number; x2: number; y2: number; opacity: number }[]; width: number } {
  const width = 40 + Math.abs(d.englishOffset) * 26;
  const dir = cueBallDirection(d.cueBall, d.objectBall, d.intended, d.spinOffset, d.englishOffset);
  if (!dir) return { segments: [], width };

  const length = Math.max(200, 560 + d.spinOffset * 140);
  const pts = buildBouncePath(d.objectBall, dir, length);
  const total = polylineLength(pts);
  const segments: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
  if (total <= 0) return { segments, width };

  const step = 26;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segLen = len(sub(b, a));
    const u = norm(sub(b, a));
    let t = 0;
    while (t < segLen) {
      const t2 = Math.min(t + step, segLen);
      const prog = (acc + (t + t2) / 2) / total;
      segments.push({
        x1: a.x + u.x * t,
        y1: a.y + u.y * t,
        x2: a.x + u.x * t2,
        y2: a.y + u.y * t2,
        opacity: Math.max(0, 0.5 * (1 - prog)),
      });
      t = t2;
    }
    acc += segLen;
  }
  return { segments, width };
}
