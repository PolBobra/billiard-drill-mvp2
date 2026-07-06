'use client';
import { useRef, useState } from 'react';

type Point = { x: number; y: number };

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
};

const W = 800;
const H = 400;

const POCKETS: Point[] = [
  { x: 20, y: 20 },
  { x: W / 2, y: 12 },
  { x: W - 20, y: 20 },
  { x: 20, y: H - 20 },
  { x: W / 2, y: H - 12 },
  { x: W - 20, y: H - 20 },
];

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
function len(v: Point) {
  return Math.hypot(v.x, v.y);
}
function norm(v: Point): Point {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}
function rotate(v: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  return {
    x: v.x * Math.cos(rad) - v.y * Math.sin(rad),
    y: v.x * Math.sin(rad) + v.y * Math.cos(rad),
  };
}
function signedAngleDeg(v1: Point, v2: Point) {
  const cross = v1.x * v2.y - v1.y * v2.x;
  const dot = v1.x * v2.x + v1.y * v2.y;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}
function categorizeDistance(px: number): 'close' | 'medium' | 'far' {
  if (px < 150) return 'close';
  if (px < 350) return 'medium';
  return 'far';
}

// Приблизительное направление битка ПОСЛЕ контакта с прицельным шаром.
// Упрощённая физика:
//  - прицельный шар катится по «линии центров» (в сторону, куда целились);
//  - биток без винта уходит по касательной — перпендикуляр к линии хода
//    прицельного шара (это составляющая скорости битка поперёк линии центров);
//  - накат (spin > 0) доворачивает траекторию битка ВПЕРЁД по ходу шара,
//    оттяжка (spin < 0) — НАЗАД;
//  - боковой винт слегка доворачивает конус вбок.
// Возвращает единичный вектор направления, либо null для вырожденного случая
// (прямой удар без винта — биток останавливается, лететь некуда).
function cueBallDirection(
  cue: Point,
  obj: Point,
  target: Point,
  spinAmt: number,
  englishAmt: number
): Point | null {
  const aim = norm(sub(obj, cue)); // куда двигался биток до удара
  const objectDir = norm(sub(target, obj)); // куда покатился прицельный шар

  const along = aim.x * objectDir.x + aim.y * objectDir.y;
  // касательная составляющая скорости битка (чистый стан-удар)
  const tangent = { x: aim.x - along * objectDir.x, y: aim.y - along * objectDir.y };

  // накат толкает вперёд по ходу шара, оттяжка — назад
  const forward = { x: objectDir.x * spinAmt * 0.9, y: objectDir.y * spinAmt * 0.9 };

  const raw = { x: tangent.x + forward.x, y: tangent.y + forward.y };
  if (len(raw) < 0.02) return null; // прямой стан-удар — биток стоит на месте

  // боковой винт слегка доворачивает конус
  return norm(rotate(norm(raw), englishAmt * 12));
}

export default function BilliardTable({
  onComplete,
}: {
  onComplete: (diagram: ShotDiagram) => void;
}) {
  const [cueBall, setCueBall] = useState<Point | null>(null);
  const [objectBall, setObjectBall] = useState<Point | null>(null);
  const [positionBall, setPositionBall] = useState<Point | null>(null);
  const [awaitingPositionBall, setAwaitingPositionBall] = useState(false);
  const [spinMarked, setSpinMarked] = useState(false);
  const [english, setEnglish] = useState(0); // -1..1
  const [spin, setSpin] = useState(0); // -1..1
  const [intended, setIntended] = useState<Point | null>(null);
  const [actual, setActual] = useState<Point | null>(null);

  // Ручная (необязательно прямая) траектория битка после удара
  const [pathMode, setPathMode] = useState(false);
  const [cuePath, setCuePath] = useState<Point[]>([]);
  const pathRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);

  const done = !!actual;

  function toPoint(e: React.MouseEvent<SVGSVGElement>): Point {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function tableClick(e: React.MouseEvent<SVGSVGElement>) {
    if (pathMode) return; // в режиме рисования клики не расставляют шары
    const point = toPoint(e);

    if (!cueBall) {
      setCueBall(point);
      return;
    }
    if (!objectBall) {
      setObjectBall(point);
      return;
    }
    if (awaitingPositionBall && !positionBall) {
      setPositionBall(point);
      setAwaitingPositionBall(false);
      return;
    }
    if (!spinMarked) return; // сначала нужно отметить винт
    if (!intended) {
      finalizeTarget('intended', point);
      return;
    }
    if (!actual) {
      finalizeTarget('actual', point);
      return;
    }
  }

  function finalizeTarget(kind: 'intended' | 'actual', point: Point) {
    if (kind === 'intended') {
      setIntended(point);
      return;
    }
    setActual(point);
    if (cueBall && objectBall && intended) {
      complete(cueBall, objectBall, intended, point);
    }
  }

  function complete(cue: Point, obj: Point, intendedPt: Point, actualPt: Point) {
    const aim = norm(sub(obj, cue));
    const vIntended = sub(intendedPt, obj);
    const vActual = sub(actualPt, obj);

    const intendedAngle = Math.abs(signedAngleDeg(aim, vIntended));
    const actualAngle = Math.abs(signedAngleDeg(aim, vActual));
    const deviation = Math.round(signedAngleDeg(vIntended, vActual));

    let suggestedError: 'недокрут' | 'перекрут' | null = null;
    if (deviation > 5) suggestedError = 'перекрут';
    else if (deviation < -5) suggestedError = 'недокрут';

    const distancePx = len(sub(obj, cue));

    onComplete({
      cueBall: cue,
      objectBall: obj,
      positionBall,
      englishOffset: english,
      spinOffset: spin,
      intended: intendedPt,
      actual: actualPt,
      intendedAngle: Math.round(intendedAngle),
      actualAngle: Math.round(actualAngle),
      deviation,
      suggestedError,
      distance: categorizeDistance(distancePx),
      distancePx: Math.round(distancePx),
    });
  }

  function handlePocketClick(p: Point) {
    if (pathMode) return;
    if (!cueBall || !objectBall || !spinMarked) return;
    if (!intended) {
      finalizeTarget('intended', p);
    } else if (!actual) {
      finalizeTarget('actual', p);
    }
  }

  function handleSpinClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const r = rect.width / 2;
    const ex = Math.max(-1, Math.min(1, x / r));
    const ey = Math.max(-1, Math.min(1, y / r));
    setEnglish(ex);
    setSpin(-ey); // вверх = накат (+), вниз = оттяжка (-)
    setSpinMarked(true);
  }

  function skipSpin() {
    setEnglish(0);
    setSpin(0);
    setSpinMarked(true);
  }

  // ----- Ручное рисование траектории битка (можно кривой) -----
  function pathDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathMode) return;
    e.preventDefault();
    drawingRef.current = true;
    pathRef.current = [toPoint(e)];
    setCuePath([...pathRef.current]);
  }
  function pathMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathMode || !drawingRef.current) return;
    e.preventDefault();
    pathRef.current = [...pathRef.current, toPoint(e)];
    setCuePath([...pathRef.current]);
  }
  function pathUp() {
    if (!pathMode) return;
    drawingRef.current = false;
  }
  function clearPath() {
    pathRef.current = [];
    drawingRef.current = false;
    setCuePath([]);
  }

  function reset() {
    setCueBall(null);
    setObjectBall(null);
    setPositionBall(null);
    setAwaitingPositionBall(false);
    setSpinMarked(false);
    setEnglish(0);
    setSpin(0);
    setIntended(null);
    setActual(null);
    setPathMode(false);
    clearPath();
  }

  // ----- Зона примерной траектории битка после удара -----
  // Появляется только ПОСЛЕ выбора прицела (в какую лузу/точку целились),
  // потому что направление битка зависит от того, куда идёт прицельный шар.
  let zone: { d: string; far: Point } | null = null;
  if (cueBall && objectBall && spinMarked && intended) {
    const centerDir = cueBallDirection(cueBall, objectBall, intended, spin, english);
    if (centerDir) {
      const length = 260 + spin * 70; // накат — дальше, оттяжка — короче
      const spread = 16 + Math.abs(english) * 18; // винт расширяет конус
      const dirA = rotate(centerDir, -spread);
      const dirB = rotate(centerDir, spread);
      const far = { x: objectBall.x + centerDir.x * length, y: objectBall.y + centerDir.y * length };
      const pA = { x: objectBall.x + dirA.x * length, y: objectBall.y + dirA.y * length };
      const pB = { x: objectBall.x + dirB.x * length, y: objectBall.y + dirB.y * length };
      zone = { d: `M ${objectBall.x} ${objectBall.y} L ${pA.x} ${pA.y} L ${pB.x} ${pB.y} Z`, far };
    }
  }

  const cuePathD = cuePath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const instructions = !cueBall
    ? '1. Кликни на стол — где стоит биток (белый шар)'
    : !objectBall
    ? '2. Кликни — где стоит прицельный шар'
    : !spinMarked
    ? '3. Отметь точку удара по битку ниже (винт/накат/оттяжка), либо нажми «Бил в центр»'
    : awaitingPositionBall
    ? '(опционально) Кликни на стол — где шар, на который хочешь выйти'
    : !intended
    ? '4. Кликни в лузу или на борт — куда целился'
    : !actual
    ? '5. Кликни — куда шар покатился на самом деле'
    : pathMode
    ? 'Зажми левую кнопку и веди по столу — линию битка можно нарисовать любой формы.'
    : 'Готово! Синяя зона — примерный полёт битка. Можно нарисовать реальную траекторию вручную.';

  return (
    <div>
      <p className="text-white/70 text-sm mb-3">{instructions}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={tableClick}
        onMouseDown={pathDown}
        onMouseMove={pathMove}
        onMouseUp={pathUp}
        onMouseLeave={pathUp}
        className="w-full rounded-xl"
        style={{
          background: '#1b6b3a',
          border: '10px solid #6b3f1f',
          cursor: pathMode ? 'crosshair' : done ? 'default' : 'crosshair',
          touchAction: pathMode ? 'none' : 'auto',
        }}
      >
        <defs>
          {zone && (
            <linearGradient
              id="cueZoneGrad"
              gradientUnits="userSpaceOnUse"
              x1={objectBall!.x}
              y1={objectBall!.y}
              x2={zone.far.x}
              y2={zone.far.y}
            >
              {/* у шара ярче, к концу траектории затухает */}
              <stop offset="0" stopColor="#3ea6ff" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="#3ea6ff" stopOpacity="0.22" />
              <stop offset="1" stopColor="#3ea6ff" stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {POCKETS.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={14}
            fill="#e0a93b"
            opacity={actual ? 0.4 : 0.9}
            onClick={(e) => {
              e.stopPropagation();
              handlePocketClick(p);
            }}
            style={{ cursor: !pathMode && spinMarked && !actual ? 'pointer' : 'default' }}
          />
        ))}

        {/* Условная зона возможной траектории битка (длинная, затухающая) */}
        {zone && <path d={zone.d} fill="url(#cueZoneGrad)" />}

        {/* Линия удара: биток -> прицельный шар */}
        {cueBall && objectBall && (
          <line x1={cueBall.x} y1={cueBall.y} x2={objectBall.x} y2={objectBall.y} stroke="white" strokeWidth={2} strokeDasharray="6,4" />
        )}

        {/* Линия намерения */}
        {objectBall && intended && (
          <line x1={objectBall.x} y1={objectBall.y} x2={intended.x} y2={intended.y} stroke="#e0a93b" strokeWidth={2} strokeDasharray="6,4" />
        )}

        {/* Линия факта */}
        {objectBall && actual && (
          <line x1={objectBall.x} y1={objectBall.y} x2={actual.x} y2={actual.y} stroke="#ff5d5d" strokeWidth={2.5} />
        )}

        {/* Нарисованная вручную траектория битка */}
        {cuePathD && (
          <path d={cuePathD} fill="none" stroke="#38f9d7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {positionBall && (
          <circle cx={positionBall.x} cy={positionBall.y} r={10} fill="#ffe14d" stroke="#333" strokeWidth={1.5} />
        )}

        {cueBall && <circle cx={cueBall.x} cy={cueBall.y} r={10} fill="white" stroke="#333" strokeWidth={1.5} />}
        {objectBall && <circle cx={objectBall.x} cy={objectBall.y} r={10} fill="#d64545" stroke="#333" strokeWidth={1.5} />}
        {intended && <circle cx={intended.x} cy={intended.y} r={6} fill="#e0a93b" stroke="#333" strokeWidth={1} />}
        {actual && <circle cx={actual.x} cy={actual.y} r={6} fill="#ff5d5d" stroke="#333" strokeWidth={1} />}
      </svg>

      {/* Селектор точки удара по битку (винт/накат/оттяжка) */}
      {cueBall && objectBall && !spinMarked && (
        <div className="mt-4 flex items-center gap-4">
          <div>
            <p className="text-white/70 text-xs mb-2">Куда кием ударил по битку:</p>
            <svg
              width={110}
              height={110}
              onClick={handleSpinClick}
              className="rounded-full cursor-crosshair"
              style={{ background: 'radial-gradient(circle, #fff 60%, #ddd)' }}
            >
              <circle cx={55} cy={55} r={53} fill="none" stroke="#999" strokeWidth={1} />
              <line x1={55} y1={5} x2={55} y2={105} stroke="#ccc" strokeWidth={1} />
              <line x1={5} y1={55} x2={105} y2={55} stroke="#ccc" strokeWidth={1} />
            </svg>
          </div>
          <button
            type="button"
            onClick={skipSpin}
            className="text-white/70 text-sm underline hover:text-white"
          >
            Бил в центр (без винта)
          </button>
        </div>
      )}

      {cueBall && objectBall && spinMarked && !intended && !awaitingPositionBall && !positionBall && (
        <button
          type="button"
          onClick={() => setAwaitingPositionBall(true)}
          className="mt-3 text-white/60 text-sm hover:text-white underline block"
        >
          + Отметить шар для выхода (необязательно)
        </button>
      )}

      {/* Ручная траектория битка — доступна после того, как всё отмечено */}
      {done && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setPathMode((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-full ${pathMode ? 'bg-accent text-black' : 'bg-white/10 text-white/80 hover:text-white'}`}
          >
            {pathMode ? 'Готово, не рисую' : '✏️ Нарисовать реальную траекторию битка'}
          </button>
          {cuePath.length > 0 && (
            <button
              type="button"
              onClick={clearPath}
              className="text-white/60 text-sm underline hover:text-white"
            >
              Очистить траекторию
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={reset} className="mt-3 text-white/60 text-sm hover:text-white underline block">
        Сбросить и начать заново
      </button>
    </div>
  );
}
