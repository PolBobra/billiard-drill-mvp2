// Система координат "по бриллиантам" для расстановки шаров в упражнениях —
// см. table-diamond-scheme.html (прислана пользователем) для схемы нумерации.
// Строится поверх PLAY/DIAMONDS/POCKETS из lib/shotGeometry.ts, чтобы схема
// упражнения визуально совпадала с интерактивным столом (те же пропорции).
//
// Нумерация:
// - Длинные борта (top/bottom): бриллианты 1-2-3 от КАЖДОГО угла к центру
//   (значит "2" на top существует дважды — слева и справа; какой из двух
//   имеется в виду, определяет crossRail: 'left' -> левая половина, 'right' -> правая).
// - Короткие борта (left/right): бриллианты 1-2-1 — "1" у каждого угла
//   (какой из двух — определяет crossRail: 'top' -> верхний, 'bottom' -> нижний),
//   "2" — общая средняя точка (одна и та же независимо от crossRail).
//
// Позиция = пересечение линии от (rail, diamond) с линией от (crossRail, crossDiamond).
// rail и crossRail обязаны быть взаимно перпендикулярны (один длинный, один короткий).

import { Point, PLAY, PLAY_W, PLAY_H, POCKETS, sub, len, clamp } from './shotGeometry';

export type Rail = 'top' | 'bottom' | 'left' | 'right';

export type DiamondCoord = {
  rail: Rail;
  diamond: number; // 1-3 если rail длинный (top/bottom), 1-2 если короткий (left/right)
  crossRail: Rail;
  crossDiamond: number;
};

export type PocketKey = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const POCKET_BY_KEY: Record<PocketKey, Point> = {
  'top-left': POCKETS[0],
  'top-center': POCKETS[1],
  'top-right': POCKETS[2],
  'bottom-left': POCKETS[3],
  'bottom-center': POCKETS[4],
  'bottom-right': POCKETS[5],
};

export function pocketPosition(key: PocketKey): Point {
  return POCKET_BY_KEY[key];
}

function isLongRail(rail: Rail): boolean {
  return rail === 'top' || rail === 'bottom';
}

// x-координата бриллианта на длинном борту: diamond 1..3 считая от угла со
// стороны `side` (та же 1/8..3/8 сетка, что использует DIAMONDS в shotGeometry.ts).
function longRailX(diamond: number, side: 'left' | 'right'): number {
  if (!Number.isInteger(diamond) || diamond < 1 || diamond > 3) {
    throw new Error(`Бриллиант ${diamond} вне диапазона 1-3 на длинном борту`);
  }
  const eighths = side === 'left' ? diamond : 8 - diamond;
  return PLAY.minX + (eighths / 8) * PLAY_W;
}

// y-координата бриллианта на коротком борту: diamond 1 — у угла со стороны
// `side`, diamond 2 — общая средняя точка (та же 1/4..3/4 сетка, что DIAMONDS).
function shortRailY(diamond: number, side: 'top' | 'bottom'): number {
  if (diamond === 2) return PLAY.minY + 0.5 * PLAY_H;
  if (diamond !== 1) throw new Error(`Бриллиант ${diamond} вне диапазона 1-2 на коротком борту`);
  const quarters = side === 'top' ? 1 : 3;
  return PLAY.minY + (quarters / 4) * PLAY_H;
}

// Переводит координату бриллиантов в точку на столе (пиксели viewBox).
export function diamondToPoint(pos: DiamondCoord): Point {
  const railIsLong = isLongRail(pos.rail);
  const crossIsLong = isLongRail(pos.crossRail);
  if (railIsLong === crossIsLong) {
    throw new Error('rail и crossRail должны быть взаимно перпендикулярны (один длинный борт, один короткий)');
  }

  const long = railIsLong ? { rail: pos.rail, diamond: pos.diamond } : { rail: pos.crossRail, diamond: pos.crossDiamond };
  const short = railIsLong ? { rail: pos.crossRail, diamond: pos.crossDiamond } : { rail: pos.rail, diamond: pos.diamond };

  const x = longRailX(long.diamond, short.rail as 'left' | 'right');
  const y = shortRailY(short.diamond, long.rail as 'top' | 'bottom');
  return { x, y };
}

// Все 18 бриллиантов с подписанными номерами — для отрисовки схемы в стиле
// table-diamond-scheme.html (нумерация 1-2-3 / 1-2-3 на длинных бортах,
// 1-2-1 на коротких, симметрично от углов).
export function getAllDiamondMarkers(): { point: Point; label: number }[] {
  const markers: { point: Point; label: number }[] = [];
  for (let d = 1; d <= 3; d++) {
    for (const x of [longRailX(d, 'left'), longRailX(d, 'right')]) {
      markers.push({ point: { x, y: PLAY.minY }, label: d });
      markers.push({ point: { x, y: PLAY.maxY }, label: d });
    }
  }
  for (const y of [shortRailY(1, 'top'), shortRailY(1, 'bottom')]) {
    markers.push({ point: { x: PLAY.minX, y }, label: 1 });
    markers.push({ point: { x: PLAY.maxX, y }, label: 1 });
  }
  const yMid = shortRailY(2, 'top');
  markers.push({ point: { x: PLAY.minX, y: yMid }, label: 2 });
  markers.push({ point: { x: PLAY.maxX, y: yMid }, label: 2 });
  return markers;
}

// Угол среза — угол между вектором прицеливания (биток -> прицельный шар) и
// вектором реального пути прицельного шара (прицельный шар -> луза). Формула
// через скалярное произведение: acos((A·B)/(|A|·|B|)), в градусах, 0..180.
// Единственный источник истины для угла в упражнении — нигде не хранится
// отдельным числом, которое могло бы разойтись с фактической геометрией.
export function calculateCutAngle(cueBallPos: Point, objectBallPos: Point, pocketPos: Point): number {
  const aim = sub(objectBallPos, cueBallPos);
  const path = sub(pocketPos, objectBallPos);
  const magnitude = len(aim) * len(path);
  if (magnitude === 0) return 0;
  const cos = clamp((aim.x * path.x + aim.y * path.y) / magnitude, -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}
