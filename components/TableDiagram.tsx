'use client';
import { W, H, PLAY, PLAY_W, PLAY_H, POCKETS, BALL_R, sub, len, norm } from '@/lib/shotGeometry';
import {
  DiamondCoord,
  PocketKey,
  diamondToPoint,
  pocketPosition,
  calculateCutAngle,
  getAllDiamondMarkers,
} from '@/lib/diamondGeometry';

// Статичная схема упражнения: биток, прицельный шар и целевая луза заданы
// координатами бриллиантов (см. lib/diamondGeometry.ts), угол среза всегда
// СЧИТАЕТСЯ здесь по факту геометрии — компонент никогда не получает и не
// доверяет отдельному числу "угол" из пропсов/базы.
//
// Визуальный стиль — как в присланной схеме table-diamond-scheme.html: плоское
// тёмно-зелёное поле, простые лузы-кружки, пронумерованные точки-бриллианты.
// Не TableFelt (тот стиль — для интерактивного стола, тут сознательно другой).
export default function TableDiagram({
  cueBallPosition,
  objectBallPosition,
  targetPocket,
}: {
  cueBallPosition: DiamondCoord;
  objectBallPosition: DiamondCoord;
  targetPocket: PocketKey;
}) {
  const cue = diamondToPoint(cueBallPosition);
  const obj = diamondToPoint(objectBallPosition);
  const pocket = pocketPosition(targetPocket);
  const angle = calculateCutAngle(cue, obj, pocket);
  const diamonds = getAllDiamondMarkers();

  // дуга угла среза в вершине прицельного шара — между направлением "назад
  // к битку" и направлением "к лузе"; сама дуга только рисует то, что уже
  // посчитано в angle, не является отдельным источником числа
  const toCue = norm(sub(cue, obj));
  const toPocket = norm(sub(pocket, obj));
  const arcR = 26;
  const p1 = { x: obj.x + toCue.x * arcR, y: obj.y + toCue.y * arcR };
  const p2 = { x: obj.x + toPocket.x * arcR, y: obj.y + toPocket.y * arcR };
  const cross = toCue.x * toPocket.y - toCue.y * toPocket.x;
  const sweepFlag = cross > 0 ? 1 : 0;
  const largeArcFlag = angle > 180 ? 1 : 0;
  const bisector = norm({ x: toCue.x + toPocket.x, y: toCue.y + toPocket.y });
  const labelPos =
    len(bisector) < 0.01
      ? { x: obj.x + toCue.x * (arcR + 16), y: obj.y + toCue.y * (arcR + 16) }
      : { x: obj.x + bisector.x * (arcR + 16), y: obj.y + bisector.y * (arcR + 16) };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ background: '#1b3a2a', borderRadius: 12 }}>
      {/* поле */}
      <rect x={0} y={0} width={W} height={H} rx={8} fill="#2a5c3f" />
      {/* граница игровой зоны */}
      <rect x={PLAY.minX} y={PLAY.minY} width={PLAY_W} height={PLAY_H} rx={4} fill="none" stroke="#173e28" strokeWidth={4} />

      {/* лузы — простые тёмные кружки */}
      {POCKETS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === 1 || i === 4 ? 16 : 18} fill="#173e28" />
      ))}

      {/* бриллианты — точки с номерами */}
      {diamonds.map((d, i) => (
        <g key={i}>
          <circle cx={d.point.x} cy={d.point.y} r={6} fill="#4a7a5c" />
          <text
            x={d.point.x}
            y={d.point.y}
            fill="#e8ede9"
            fontSize={11}
            fontFamily="monospace"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {d.label}
          </text>
        </g>
      ))}

      {/* линия прицеливания: биток -> прицельный шар */}
      <line x1={cue.x} y1={cue.y} x2={obj.x} y2={obj.y} stroke="#fff" strokeWidth={2} strokeDasharray="6,4" opacity={0.6} />
      {/* реальный путь прицельного шара: прицельный шар -> луза */}
      <line x1={obj.x} y1={obj.y} x2={pocket.x} y2={pocket.y} stroke="#e0a93b" strokeWidth={2.5} strokeDasharray="6,4" />

      {/* дуга угла среза */}
      <path
        d={`M ${p1.x} ${p1.y} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${p2.x} ${p2.y}`}
        fill="none"
        stroke="#38f9d7"
        strokeWidth={1.5}
      />
      <text x={labelPos.x} y={labelPos.y} fill="#38f9d7" fontSize={16} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        {Math.round(angle)}°
      </text>

      <circle cx={cue.x} cy={cue.y} r={BALL_R} fill="#fff" stroke="#333" strokeWidth={1.5} />
      <circle cx={obj.x} cy={obj.y} r={BALL_R} fill="#d64545" stroke="#333" strokeWidth={1.5} />
    </svg>
  );
}
