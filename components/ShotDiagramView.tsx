'use client';
import { W, H, POCKETS, ShotDiagram, zoneSegments } from '@/lib/shotGeometry';

// Показывает сохранённый рисунок удара (только чтение).
export default function ShotDiagramView({ d }: { d: ShotDiagram }) {
  const { segments, width } = zoneSegments(d);
  const cuePathD = (d.cuePath || [])
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl"
      style={{ background: '#1b6b3a', border: '10px solid #6b3f1f' }}
    >
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#3ea6ff"
          strokeWidth={width}
          strokeLinecap="round"
          opacity={s.opacity}
        />
      ))}

      {POCKETS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={14} fill="#e0a93b" opacity={0.4} />
      ))}

      <line x1={d.cueBall.x} y1={d.cueBall.y} x2={d.objectBall.x} y2={d.objectBall.y} stroke="white" strokeWidth={2} strokeDasharray="6,4" />
      <line x1={d.objectBall.x} y1={d.objectBall.y} x2={d.intended.x} y2={d.intended.y} stroke="#e0a93b" strokeWidth={2} strokeDasharray="6,4" />
      <line x1={d.objectBall.x} y1={d.objectBall.y} x2={d.actual.x} y2={d.actual.y} stroke="#ff5d5d" strokeWidth={2.5} />

      {cuePathD && (
        <path d={cuePathD} fill="none" stroke="#38f9d7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {d.positionBall && <circle cx={d.positionBall.x} cy={d.positionBall.y} r={10} fill="#ffe14d" stroke="#333" strokeWidth={1.5} />}
      <circle cx={d.cueBall.x} cy={d.cueBall.y} r={10} fill="white" stroke="#333" strokeWidth={1.5} />
      <circle cx={d.objectBall.x} cy={d.objectBall.y} r={10} fill="#d64545" stroke="#333" strokeWidth={1.5} />
      <circle cx={d.intended.x} cy={d.intended.y} r={6} fill="#e0a93b" stroke="#333" strokeWidth={1} />
      <circle cx={d.actual.x} cy={d.actual.y} r={6} fill="#ff5d5d" stroke="#333" strokeWidth={1} />
    </svg>
  );
}
