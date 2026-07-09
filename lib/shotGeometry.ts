// Общая геометрия бильярдного стола: используется и интерактивным столом,
// и просмотром сохранённого рисунка (только чтение).

export type Point = { x: number; y: number };

export const W = 800;
export const H = 400;

// Конструкция стола (в координатах viewBox 0..W × 0..H):
// внешняя деревянная рама → борт из сукна → игровая поверхность.
export const FRAME = 9; // толщина деревянной рамы
export const RAIL = 34; // ширина борта из сукна (его внутренний край = игровое поле)
export const BALL_R = 11; // радиус шара
export const POCKET_R = 19; // радиус лузы (впадины)
export const MIN_BALL_DIST = BALL_R * 2; // минимальное расстояние между центрами шаров — не даём им накладываться

// Игровое поле — по внутреннему краю бортов.
export const PLAY = { minX: RAIL, minY: RAIL, maxX: W - RAIL, maxY: H - RAIL };
export const PLAY_W = PLAY.maxX - PLAY.minX;
export const PLAY_H = PLAY.maxY - PLAY.minY;

// границы, от которых отскакивает биток — центр шара останавливается на
// расстоянии радиуса от сукна борта (сам борт задевает не центр, а край шара),
// иначе предсказанная траектория "проваливается" в борт на BALL_R пикселей
// глубже, чем шар физически может там оказаться (см. clampPlay в BilliardTable.tsx,
// которая ставит шары с тем же отступом — здесь отступа не было, отскок и
// расстановка шаров жили по разным границам).
export const BOUNDS = {
  minX: PLAY.minX + BALL_R,
  maxX: PLAY.maxX - BALL_R,
  minY: PLAY.minY + BALL_R,
  maxY: PLAY.maxY - BALL_R,
};

// Средние лузы вдавлены чуть глубже в борт (дальше от игрового поля), чтобы
// визуально сидеть в вырезе борта, а не торчать в сукно, как угловые.
const MID_POCKET_RECESS = 6;

// Лузы — в углах игрового поля и по центрам длинных бортов.
export const POCKETS: Point[] = [
  { x: PLAY.minX, y: PLAY.minY },
  { x: W / 2, y: PLAY.minY - MID_POCKET_RECESS },
  { x: PLAY.maxX, y: PLAY.minY },
  { x: PLAY.minX, y: PLAY.maxY },
  { x: W / 2, y: PLAY.maxY + MID_POCKET_RECESS },
  { x: PLAY.maxX, y: PLAY.maxY },
];

// Бриллианты (метки прицела) на бортах: по центральной линии сукна борта.
const RAIL_MID = (FRAME + RAIL) / 2; // середина полосы сукна борта
export const DIAMONDS: Point[] = [
  // длинные борта (верх/низ) — по 3 с каждой стороны от центральной лузы
  ...[1, 2, 3, 5, 6, 7].flatMap((i) => {
    const x = PLAY.minX + (i / 8) * PLAY_W;
    return [
      { x, y: RAIL_MID },
      { x, y: H - RAIL_MID },
    ];
  }),
  // короткие борта (лево/право) — по 3
  ...[1, 2, 3].flatMap((i) => {
    const y = PLAY.minY + (i / 4) * PLAY_H;
    return [
      { x: RAIL_MID, y },
      { x: W - RAIL_MID, y },
    ];
  }),
];

// Линия «дома» — на 1/4 длины стола от короткого борта.
export const HEAD_X = PLAY.minX + PLAY_W * 0.25;

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

// Направление И «сила» битка после контакта с прицельным шаром (правило
// прямой линии: стан-удар уводит биток строго перпендикулярно пути прицельного
// шара; накат/оттяжка продолжают его движение вдоль ЕГО СОБСТВЕННОЙ линии
// удара — а не линии прицельного шара, иначе при резаном ударе под углом
// биток "уезжает" вслед за прицельным шаром вместо продолжения своего пути).
// power ~ 0..1.35: тонкий срез почти без наката — маленькая сила (короткий
// скачок), толстый срез или сильный накат — большая (далёкий выход).
// null — совсем прямой стан-удар в упор: биток замирает на месте.
export function cueBallShot(
  cue: Point,
  obj: Point,
  target: Point,
  spinAmt: number,
  englishAmt: number
): { dir: Point; power: number } | null {
  const aim = norm(sub(obj, cue));
  const objectDir = norm(sub(target, obj));
  const along = aim.x * objectDir.x + aim.y * objectDir.y;
  const tangent = { x: aim.x - along * objectDir.x, y: aim.y - along * objectDir.y };
  const forward = { x: aim.x * spinAmt * 0.9, y: aim.y * spinAmt * 0.9 };
  const raw = { x: tangent.x + forward.x, y: tangent.y + forward.y };
  const power = len(raw);
  if (power < 0.02) return null;
  return { dir: norm(rotate(norm(raw), englishAmt * 12)), power };
}

// Если шар долетает до лузы — считаем, что он в неё падает, а не отскакивает.
const POCKET_CAPTURE = POCKET_R + BALL_R + 4;
function pocketAt(p: Point): Point | null {
  for (const pk of POCKETS) if (len(sub(pk, p)) <= POCKET_CAPTURE) return pk;
  return null;
}

// Траектория битка с отскоками от бортов до заданной длины.
// Если по пути встречается луза — путь обрывается в ней (шар падает, дальше не летит).
export function buildBouncePath(start: Point, dir: Point, length: number): Point[] {
  const pts: Point[] = [
    { x: clamp(start.x, BOUNDS.minX, BOUNDS.maxX), y: clamp(start.y, BOUNDS.minY, BOUNDS.maxY) },
  ];
  let pos = { ...pts[0] };
  let d = { ...dir };
  let remaining = length;

  const startPocket = pocketAt(pos);
  if (startPocket) return pts; // уже стоит в лузе — некуда лететь

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
      // страховка: точка физически не может оказаться за бортом, даже если
      // где-то накопится погрешность вычислений
      pos = { x: clamp(pos.x, BOUNDS.minX, BOUNDS.maxX), y: clamp(pos.y, BOUNDS.minY, BOUNDS.maxY) };
      pts.push({ ...pos });
      break;
    }
    pos = { x: pos.x + d.x * tHit, y: pos.y + d.y * tHit };
    pos = { x: clamp(pos.x, BOUNDS.minX, BOUNDS.maxX), y: clamp(pos.y, BOUNDS.minY, BOUNDS.maxY) };
    pts.push({ ...pos });

    const pk = pocketAt(pos);
    if (pk) {
      pts[pts.length - 1] = { ...pk }; // шар падает точно в центр лузы
      break;
    }

    if (Math.abs(tHit - tx) < 1e-4) d = { x: -d.x, y: d.y };
    if (Math.abs(tHit - ty) < 1e-4) d = { x: d.x, y: -d.y };
    remaining -= tHit;
  }
  return pts;
}

// Отодвигает точку от уже поставленных шаров, чтобы центры не оказывались
// ближе MIN_BALL_DIST друг к другу (иначе шары визуально сливаются в один).
export function resolveBallOverlap(p: Point, others: (Point | null)[]): Point {
  let result = { ...p };
  const pts = others.filter((o): o is Point => !!o);
  for (let pass = 0; pass < 4; pass++) {
    for (const o of pts) {
      const d = sub(result, o);
      const dist = len(d);
      if (dist >= MIN_BALL_DIST) continue;
      if (dist < 0.001) {
        result = { x: result.x + MIN_BALL_DIST, y: result.y };
      } else {
        const dir = norm(d);
        const push = MIN_BALL_DIST - dist;
        result = { x: result.x + dir.x * push, y: result.y + dir.y * push };
      }
    }
  }
  return result;
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

// Общий расчёт зоны полёта битка: точки пути + ширина полосы.
// Длина пути зависит от «силы» удара (см. cueBallShot) — тонкий срез без
// наката даёт короткий скачок, толстый срез или накат — далёкий выход.
export function computeShotZone(
  d: Pick<ShotDiagram, 'cueBall' | 'objectBall' | 'intended' | 'spinOffset' | 'englishOffset'>
): { pts: Point[]; width: number } | null {
  const shot = cueBallShot(d.cueBall, d.objectBall, d.intended, d.spinOffset, d.englishOffset);
  if (!shot) return null;

  const width = 42 + Math.abs(d.englishOffset) * 24;
  const length = 90 + shot.power * (760 + d.spinOffset * 240);
  const pts = buildBouncePath(d.objectBall, shot.dir, Math.max(70, length));
  return { pts, width };
}

// Плавно затухающая «зона» полёта битка: единая линия с градиентом прозрачности
// вдоль траектории (без «пузырей» из отдельных сегментов).
export function zoneBand(
  d: Pick<ShotDiagram, 'cueBall' | 'objectBall' | 'intended' | 'spinOffset' | 'englishOffset'>
): { d: string; width: number; x1: number; y1: number; x2: number; y2: number } | null {
  const zone = computeShotZone(d);
  if (!zone || zone.pts.length < 2) return null;
  const { pts, width } = zone;

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Ось градиента — от старта до самой удалённой точки траектории.
  let far = pts[0];
  let maxD = 0;
  for (const p of pts) {
    const dd = len(sub(p, pts[0]));
    if (dd > maxD) {
      maxD = dd;
      far = p;
    }
  }
  return { d: path, width, x1: pts[0].x, y1: pts[0].y, x2: far.x, y2: far.y };
}
