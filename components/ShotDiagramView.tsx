'use client';
import { useId } from 'react';
import { W, H, POCKETS, BALL_R, ShotDiagram, zoneBand } from '@/lib/shotGeometry';
import TableFelt, { TableDefs, Pocket } from '@/components/TableFelt';

// Показывает сохранённый рисунок удара (только чтение).
export default function ShotDiagramView({ d }: { d: ShotDiagram }) {
  const pfx = useId();
  const band = zoneBand(d);
  const cuePathD = (d.cuePath || [])
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl">
      <TableDefs idPrefix={pfx} />
      {band && (
        <defs>
          <linearGradient
            id={`${pfx}-zone`}
            gradientUnits="userSpaceOnUse"
            x1={band.x1}
            y1={band.y1}
            x2={band.x2}
            y2={band.y2}
          >
            <stop offset="0" stopColor="#3ea6ff" stopOpacity={0.55} />
            <stop offset="1" stopColor="#3ea6ff" stopOpacity={0} />
          </linearGradient>
        </defs>
      )}

      <TableFelt idPrefix={pfx} />

      {band && (
        <path
          d={band.d}
          fill="none"
          stroke={`url(#${pfx}-zone)`}
          strokeWidth={band.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      <line x1={d.cueBall.x} y1={d.cueBall.y} x2={d.objectBall.x} y2={d.objectBall.y} stroke="white" strokeWidth={2} strokeDasharray="6,4" />
      <line x1={d.objectBall.x} y1={d.objectBall.y} x2={d.intended.x} y2={d.intended.y} stroke="#e0a93b" strokeWidth={2} strokeDasharray="6,4" />
      <line x1={d.objectBall.x} y1={d.objectBall.y} x2={d.actual.x} y2={d.actual.y} stroke="#ff5d5d" strokeWidth={2.5} />

      {cuePathD && (
        <path d={cuePathD} fill="none" stroke="#38f9d7" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {POCKETS.map((p, i) => (
        <Pocket key={i} p={p} idPrefix={pfx} />
      ))}

      {d.positionBall && <circle cx={d.positionBall.x} cy={d.positionBall.y} r={BALL_R} fill="#ffe14d" stroke="#333" strokeWidth={1.5} />}
      <circle cx={d.cueBall.x} cy={d.cueBall.y} r={BALL_R} fill="white" stroke="#333" strokeWidth={1.5} />
      <circle cx={d.objectBall.x} cy={d.objectBall.y} r={BALL_R} fill="#d64545" stroke="#333" strokeWidth={1.5} />
      <circle cx={d.intended.x} cy={d.intended.y} r={6} fill="#e0a93b" stroke="#333" strokeWidth={1} />
      <circle cx={d.actual.x} cy={d.actual.y} r={6} fill="#ff5d5d" stroke="#333" strokeWidth={1} />
    </svg>
  );
}
