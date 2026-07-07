'use client';
import {
  W,
  H,
  FRAME,
  RAIL,
  PLAY,
  POCKET_R,
  POCKETS,
  DIAMONDS,
  HEAD_X,
  Point,
} from '@/lib/shotGeometry';

// Радиус скругления сукна у угловых луз и радиус выемки у средних —
// чтобы сукно плавно уходило в лузу, а не упиралось в неё прямым углом.
const CORNER_CUT = POCKET_R + 9;
const MID_NOTCH = POCKET_R + 5;

// Общие defs (градиенты дерева/сукна/поля/лузы). idPrefix делает id уникальными,
// чтобы несколько столов на одной странице не конфликтовали.
export function TableDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <linearGradient id={`${idPrefix}-wood`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7a4a24" />
        <stop offset="0.5" stopColor="#5f3819" />
        <stop offset="1" stopColor="#432610" />
      </linearGradient>
      <linearGradient id={`${idPrefix}-rail`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1c7a45" />
        <stop offset="1" stopColor="#0e5030" />
      </linearGradient>
      <radialGradient id={`${idPrefix}-felt`} cx="0.5" cy="0.45" r="0.75">
        <stop offset="0" stopColor="#1e7440" />
        <stop offset="1" stopColor="#124f2c" />
      </radialGradient>
      <radialGradient id={`${idPrefix}-pocket`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000000" />
        <stop offset="0.55" stopColor="#050807" />
        <stop offset="1" stopColor="#20362a" />
      </radialGradient>
    </defs>
  );
}

// Впалая луза: тёмная радиальная впадина + мягкая тень-ободок вокруг.
export function Pocket({ p, idPrefix, r = POCKET_R }: { p: Point; idPrefix: string; r?: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={p.x} cy={p.y} r={r + 3} fill="#04140c" opacity={0.55} />
      <circle cx={p.x} cy={p.y} r={r} fill={`url(#${idPrefix}-pocket)`} />
      <circle cx={p.x} cy={p.y} r={r} fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={1.5} />
      <circle cx={p.x} cy={p.y} r={r * 0.46} fill="#000" opacity={0.7} />
    </g>
  );
}

// Статичная «доска» стола: рама, борта из сукна, игровое поле,
// бриллианты и линия дома. Лузы и шары рисует родитель поверх.
export default function TableFelt({ idPrefix }: { idPrefix: string }) {
  return (
    <g>
      {/* деревянная рама */}
      <rect x={0} y={0} width={W} height={H} rx={20} fill={`url(#${idPrefix}-wood)`} />
      {/* борт из сукна */}
      <rect
        x={FRAME}
        y={FRAME}
        width={W - 2 * FRAME}
        height={H - 2 * FRAME}
        rx={14}
        fill={`url(#${idPrefix}-rail)`}
      />
      {/* тень борта у кромки поля (объём) */}
      <rect
        x={RAIL - 3}
        y={RAIL - 3}
        width={PLAY.maxX - PLAY.minX + 6}
        height={PLAY.maxY - PLAY.minY + 6}
        rx={6}
        fill="none"
        stroke="#05301c"
        strokeWidth={5}
        opacity={0.55}
      />
      {/* игровое поле — скруглённые углы у угловых луз, чтобы сукно плавно
          уходило в лузу вместо прямого угла */}
      <rect
        x={PLAY.minX}
        y={PLAY.minY}
        width={PLAY.maxX - PLAY.minX}
        height={PLAY.maxY - PLAY.minY}
        rx={CORNER_CUT}
        fill={`url(#${idPrefix}-felt)`}
      />
      {/* выемки в сукне под средние лузы (цвет борта, чтобы получился вырез) —
          центр совпадает с реальной (вдавленной в борт) позицией лузы */}
      <circle cx={POCKETS[1].x} cy={POCKETS[1].y} r={MID_NOTCH} fill={`url(#${idPrefix}-rail)`} />
      <circle cx={POCKETS[4].x} cy={POCKETS[4].y} r={MID_NOTCH} fill={`url(#${idPrefix}-rail)`} />

      {/* линия дома */}
      <line
        x1={HEAD_X}
        y1={PLAY.minY}
        x2={HEAD_X}
        y2={PLAY.maxY}
        stroke="#ffffff"
        strokeOpacity={0.16}
        strokeWidth={1.5}
      />
      <circle cx={HEAD_X} cy={H / 2} r={2.5} fill="#ffffff" opacity={0.22} />

      {/* бриллианты на бортах */}
      {DIAMONDS.map((d, i) => (
        <path
          key={i}
          d={`M ${d.x} ${d.y - 4} L ${d.x + 4} ${d.y} L ${d.x} ${d.y + 4} L ${d.x - 4} ${d.y} Z`}
          fill="#ece4c7"
          opacity={0.9}
          stroke="#5a4a25"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}
