'use client';
import { useRef, useState } from 'react';
import {
  Point,
  ShotDiagram,
  W,
  H,
  POCKETS,
  sub,
  len,
  norm,
  signedAngleDeg,
  categorizeDistance,
  clamp,
  cueBallDirection,
  buildBouncePath,
  polylineLength,
  distToPolyline,
} from '@/lib/shotGeometry';

export type { ShotDiagram };

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
  const baseDiagramRef = useRef<ShotDiagram | null>(null);

  const done = !!actual;

  // ----- Геометрия зоны возможного полёта битка (с отскоками) -----
  const zoneWidth = 40 + Math.abs(english) * 26;
  const zoneHalf = zoneWidth / 2;
  let zonePts: Point[] | null = null;
  let zoneTotal = 0;
  if (cueBall && objectBall && spinMarked && intended) {
    const dir = cueBallDirection(cueBall, objectBall, intended, spin, english);
    if (dir) {
      const length = 560 + spin * 140; // длинная; накат ещё длиннее, оттяжка короче
      zonePts = buildBouncePath(objectBall, dir, Math.max(200, length));
      zoneTotal = polylineLength(zonePts);
    }
  }

  function toPoint(e: React.MouseEvent<SVGSVGElement>): Point {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function tableClick(e: React.MouseEvent<SVGSVGElement>) {
    if (pathMode) return;
    const point = toPoint(e);
    if (!cueBall) return setCueBall(point);
    if (!objectBall) return setObjectBall(point);
    if (awaitingPositionBall && !positionBall) {
      setPositionBall(point);
      setAwaitingPositionBall(false);
      return;
    }
    if (!spinMarked) return;
    if (!intended) return finalizeTarget('intended', point);
    if (!actual) return finalizeTarget('actual', point);
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

    const diagram: ShotDiagram = {
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
      cuePath: [],
    };
    baseDiagramRef.current = diagram;
    onComplete(diagram);
  }

  // Пере-отдаём диаграмму с обновлённой нарисованной траекторией
  function emitWithPath(path: Point[]) {
    if (!baseDiagramRef.current) return;
    onComplete({ ...baseDiagramRef.current, cuePath: path });
  }

  function handlePocketClick(p: Point) {
    if (pathMode) return;
    if (!cueBall || !objectBall || !spinMarked) return;
    if (!intended) finalizeTarget('intended', p);
    else if (!actual) finalizeTarget('actual', p);
  }

  function handleSpinClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const r = rect.width / 2;
    setEnglish(clamp(x / r, -1, 1));
    setSpin(clamp(-y / r, -1, 1)); // вверх = накат (+), вниз = оттяжка (-)
    setSpinMarked(true);
  }

  function skipSpin() {
    setEnglish(0);
    setSpin(0);
    setSpinMarked(true);
  }

  // ----- Ручное рисование траектории битка (только внутри зоны) -----
  function inZone(p: Point) {
    if (!zonePts) return true; // зоны нет (прямой удар) — рисуем свободно
    return distToPolyline(p, zonePts) <= zoneHalf;
  }
  function pushPoint(p: Point) {
    const last = pathRef.current[pathRef.current.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 4) return; // прореживаем
    if (!inZone(p)) return; // только внутри зоны полёта
    pathRef.current = [...pathRef.current, p];
    setCuePath(pathRef.current);
  }
  function pathDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathMode) return;
    e.preventDefault();
    drawingRef.current = true;
    const p = toPoint(e);
    pathRef.current = inZone(p) ? [p] : [];
    setCuePath(pathRef.current);
  }
  function pathMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!pathMode || !drawingRef.current) return;
    e.preventDefault();
    pushPoint(toPoint(e));
  }
  function pathUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    emitWithPath(pathRef.current);
  }
  function redrawPath() {
    pathRef.current = [];
    drawingRef.current = false;
    setCuePath([]);
    setPathMode(true);
    emitWithPath([]);
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
    pathRef.current = [];
    drawingRef.current = false;
    baseDiagramRef.current = null;
    setCuePath([]);
  }

  // сегменты зоны с затуханием к концу траектории
  const segs: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
  if (zonePts && zoneTotal > 0) {
    const step = 26;
    let acc = 0;
    for (let i = 0; i < zonePts.length - 1; i++) {
      const a = zonePts[i];
      const b = zonePts[i + 1];
      const segLen = len(sub(b, a));
      const dir = norm(sub(b, a));
      let t = 0;
      while (t < segLen) {
        const t2 = Math.min(t + step, segLen);
        const prog = (acc + (t + t2) / 2) / zoneTotal;
        segs.push({
          x1: a.x + dir.x * t,
          y1: a.y + dir.y * t,
          x2: a.x + dir.x * t2,
          y2: a.y + dir.y * t2,
          opacity: Math.max(0, 0.5 * (1 - prog)),
        });
        t = t2;
      }
      acc += segLen;
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
    ? 'Зажми левую кнопку и веди по столу внутри синей зоны — линию битка можно рисовать любой формы.'
    : 'Готово! Синяя зона — примерный полёт битка с отскоками. Можно нарисовать реальную траекторию вручную.';

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
          cursor: pathMode || !done ? 'crosshair' : 'default',
          touchAction: pathMode ? 'none' : 'auto',
        }}
      >
        {/* Зона возможной траектории битка (длинная, с отскоками, затухает) */}
        {segs.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="#3ea6ff"
            strokeWidth={zoneWidth}
            strokeLinecap="round"
            opacity={s.opacity}
          />
        ))}

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

        {positionBall && <circle cx={positionBall.x} cy={positionBall.y} r={10} fill="#ffe14d" stroke="#333" strokeWidth={1.5} />}
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
          <button type="button" onClick={skipSpin} className="text-white/70 text-sm underline hover:text-white">
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

      {/* Ручная траектория битка */}
      {done && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!pathMode && cuePath.length === 0 && (
            <button
              type="button"
              onClick={() => setPathMode(true)}
              className="text-sm px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:text-white"
            >
              ✏️ Нарисовать траекторию битка
            </button>
          )}
          {pathMode && (
            <button
              type="button"
              onClick={() => setPathMode(false)}
              className="text-sm px-3 py-1.5 rounded-full bg-accent text-black"
            >
              Готово
            </button>
          )}
          {cuePath.length > 0 && (
            <button
              type="button"
              onClick={redrawPath}
              className="text-sm px-3 py-1.5 rounded-full bg-white/10 text-white/80 hover:text-white"
            >
              🔁 Нарисовать заново
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
