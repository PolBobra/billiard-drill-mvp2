'use client';
import { useState } from 'react';

type Point = { x: number; y: number };

export type ShotDiagram = {
  cueBall: Point;
  objectBall: Point;
  target: Point;
  angle: number; // угол среза в градусах, 0 = прямой удар, 90 = максимальный срез
  distance: 'close' | 'medium' | 'far';
  distancePx: number;
};

const W = 800;
const H = 400;

// Лузы: 4 угла + 2 средние по длинным бортам
const POCKETS: Point[] = [
  { x: 20, y: 20 },
  { x: W / 2, y: 12 },
  { x: W - 20, y: 20 },
  { x: 20, y: H - 20 },
  { x: W / 2, y: H - 12 },
  { x: W - 20, y: H - 20 },
];

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleBetween(cue: Point, obj: Point, target: Point) {
  const v1 = { x: obj.x - cue.x, y: obj.y - cue.y };
  const v2 = { x: target.x - obj.x, y: target.y - obj.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
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
  const [target, setTarget] = useState<Point | null>(null);

  const step = !cueBall ? 1 : !objectBall ? 2 : !target ? 3 : 4;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const point = { x: Math.round(x), y: Math.round(y) };

    if (!cueBall) {
      setCueBall(point);
    } else if (!objectBall) {
      setObjectBall(point);
    } else if (!target) {
      setTarget(point);
      const angle = angleBetween(cueBall, objectBall, point);
      const distancePx = dist(cueBall, objectBall);
      onComplete({
        cueBall,
        objectBall,
        target: point,
        angle,
        distance: categorizeDistance(distancePx),
        distancePx: Math.round(distancePx),
      });
    }
  }

  function handlePocketClick(pocket: Point) {
    if (cueBall && objectBall && !target) {
      setTarget(pocket);
      const angle = angleBetween(cueBall, objectBall, pocket);
      const distancePx = dist(cueBall, objectBall);
      onComplete({
        cueBall,
        objectBall,
        target: pocket,
        angle,
        distance: categorizeDistance(distancePx),
        distancePx: Math.round(distancePx),
      });
    }
  }

  function reset() {
    setCueBall(null);
    setObjectBall(null);
    setTarget(null);
  }

  const instructions = [
    '1. Кликни на стол — где стоит биток (белый шар)',
    '2. Теперь кликни — где стоит прицельный шар',
    '3. Кликни в лузу (жёлтый кружок) или на борт — куда целился шар',
    'Готово! Диаграмма построена.',
  ];

  return (
    <div>
      <p className="text-white/70 text-sm mb-3">{instructions[step - 1]}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        className="w-full rounded-xl cursor-crosshair"
        style={{ background: '#1b6b3a', border: '10px solid #6b3f1f' }}
      >
        {/* Лузы */}
        {POCKETS.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={14}
            fill="#e0a93b"
            opacity={target ? 0.4 : 0.9}
            onClick={(e) => {
              e.stopPropagation();
              handlePocketClick(p);
            }}
            style={{ cursor: cueBall && objectBall && !target ? 'pointer' : 'default' }}
          />
        ))}

        {/* Линия удара: биток -> прицельный шар */}
        {cueBall && objectBall && (
          <line
            x1={cueBall.x}
            y1={cueBall.y}
            x2={objectBall.x}
            y2={objectBall.y}
            stroke="white"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Линия прицела: прицельный шар -> цель */}
        {objectBall && target && (
          <line
            x1={objectBall.x}
            y1={objectBall.y}
            x2={target.x}
            y2={target.y}
            stroke="#e0a93b"
            strokeWidth={2}
            strokeDasharray="6,4"
          />
        )}

        {/* Биток */}
        {cueBall && (
          <circle cx={cueBall.x} cy={cueBall.y} r={10} fill="white" stroke="#333" strokeWidth={1.5} />
        )}

        {/* Прицельный шар */}
        {objectBall && (
          <circle cx={objectBall.x} cy={objectBall.y} r={10} fill="#d64545" stroke="#333" strokeWidth={1.5} />
        )}
      </svg>

      <button
        type="button"
        onClick={reset}
        className="mt-3 text-white/60 text-sm hover:text-white underline"
      >
        Сбросить и начать заново
      </button>
    </div>
  );
}
