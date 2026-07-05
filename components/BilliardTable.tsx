'use client';
import { useState } from 'react';

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

  const readyForSpin = !!cueBall && !!objectBall && !spinMarked;
  const readyForIntended = spinMarked && !intended;
  const readyForActual = !!intended && !actual;

  function tableClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const point = { x: Math.round(x), y: Math.round(y) };

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
  }

  // ----- Зона примерной траектории битка после удара (условная, не настоящая физика) -----
  let zonePath: string | null = null;
  if (cueBall && objectBall && spinMarked) {
    const aim = norm(sub(objectBall, cueBall));
    const refDir = intended ? norm(sub(intended, objectBall)) : aim;
    const cross = aim.x * refDir.y - aim.y * refDir.x;
    const perp = cross >= 0 ? rotate(aim, -90) : rotate(aim, 90);

    // накат/оттяжка сдвигают направление к линии удара вперёд/назад
    const spinRotation = spin * 35; // градусы
    // винт (лево/право) расширяет и сдвигает конус
    const englishRotation = english * 20;

    const centerDir = rotate(perp, spinRotation + englishRotation);
    const spread = 18 + Math.abs(english) * 18;
    const length = 200 + spin * 60;

    const dirA = rotate(centerDir, -spread);
    const dirB = rotate(centerDir, spread);

    const pA = { x: objectBall.x + dirA.x * length, y: objectBall.y + dirA.y * length };
    const pB = { x: objectBall.x + dirB.x * length, y: objectBall.y + dirB.y * length };

    zonePath = `M ${objectBall.x} ${objectBall.y} L ${pA.x} ${pA.y} L ${pB.x} ${pB.y} Z`;
  }

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
    : 'Готово! Диаграмма построена.';

  return (
    <div>
      <p className="text-white/70 text-sm mb-3">{instructions}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={tableClick}
        className="w-full rounded-xl cursor-crosshair"
        style={{ background: '#1b6b3a', border: '10px solid #6b3f1f' }}
      >
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
            style={{ cursor: spinMarked && !actual ? 'pointer' : 'default' }}
          />
        ))}

        {/* Условная зона возможной траектории битка */}
        {zonePath && <path d={zonePath} fill="#3ea6ff" opacity={0.25} />}

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

      <button type="button" onClick={reset} className="mt-3 text-white/60 text-sm hover:text-white underline block">
        Сбросить и начать заново
      </button>
    </div>
  );
}
