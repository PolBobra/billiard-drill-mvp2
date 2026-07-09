import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAnthropic } from '@/lib/anthropic';

type Exercise = {
  id: string;
  name: string;
  error_type: string;
  angle_min: number;
  angle_max: number;
  distance: string;
  situation_type: string | null;
  description: string | null;
  reps: number;
  success_criteria: string | null;
  difficulty: number;
};

// Резервный подбор без ИИ — та же тиражированная логика, что раньше жила в
// lib/matching.ts (точное совпадение -> ослабляем критерии). Используется,
// если ключ Claude ещё не настроен или сам вызов упал (сеть/лимиты) — чтобы
// фича "зафиксировать удар" не ломалась целиком из-за внешнего сервиса.
function fallbackMatch(exercises: Exercise[], errorType: string, angle: number, distance: string): Exercise | null {
  const exact = exercises.find(
    (e) => e.error_type === errorType && e.distance === distance && angle >= e.angle_min && angle <= e.angle_max
  );
  if (exact) return exact;

  const partial = exercises.find((e) => e.error_type === errorType && e.distance === distance);
  if (partial) return partial;

  const loose = exercises.find((e) => e.error_type === errorType);
  return loose || null;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { errorType, angle, actualAngle, deviation, distance, englishOffset, spinOffset } = await req.json();
  if (!errorType || typeof angle !== 'number' || !distance) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: exercises, error } = await admin
    .from('exercises')
    .select('id, name, error_type, angle_min, angle_max, distance, situation_type, description, reps, success_criteria, difficulty');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!exercises || exercises.length === 0) {
    return NextResponse.json({ exercise: null, matchQuality: 'none' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const exercise = fallbackMatch(exercises, errorType, angle, distance);
    return NextResponse.json({ exercise, matchQuality: exercise ? 'ai_fallback' : 'none' });
  }

  const exerciseList = exercises
    .map(
      (e) =>
        `- id: ${e.id}\n  название: ${e.name}\n  тип_ошибки: ${e.error_type}\n  угол: ${e.angle_min}–${e.angle_max}°\n  дистанция: ${e.distance}\n  ситуация: ${e.situation_type || '—'}\n  сложность: ${e.difficulty}\n  описание: ${e.description || '—'}`
    )
    .join('\n\n');

  const situationText = [
    `Тип ошибки, который выбрал игрок: ${errorType}`,
    `Планировал срезать шар под углом: ${angle}°`,
    typeof actualAngle === 'number' ? `По факту получилось под углом: ${actualAngle}°` : null,
    typeof deviation === 'number' ? `Отклонение: ${deviation > 0 ? '+' : ''}${deviation}°` : null,
    `Дистанция до шара: ${distance}`,
    typeof englishOffset === 'number' && englishOffset !== 0 ? `Боковой винт (винт слева/справа, -1..1): ${englishOffset}` : null,
    typeof spinOffset === 'number' && spinOffset !== 0 ? `Верх/низ винта (накат/оттяжка, -1..1): ${spinOffset}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              exercise_id: { type: ['string', 'null'], enum: [...exercises.map((e) => e.id), null] },
              reasoning: { type: 'string' },
            },
            required: ['exercise_id', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      system:
        'Ты — тренер по бильярду. По описанию конкретной ошибки игрока и списку упражнений из базы выбери ОДНО упражнение, которое лучше всего подходит для отработки именно этой ошибки — учитывай тип ошибки, угол среза, дистанцию и данные о винте, а не только формальное совпадение полей. Если ни одно упражнение реально не подходит, верни null. Объясни выбор одним-двумя предложениями на русском.',
      messages: [
        {
          role: 'user',
          content: `Ситуация игрока:\n${situationText}\n\nСписок упражнений в базе:\n${exerciseList}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Пустой ответ от модели');
    const parsed = JSON.parse(textBlock.text) as { exercise_id: string | null; reasoning: string };

    const exercise = parsed.exercise_id ? exercises.find((e) => e.id === parsed.exercise_id) || null : null;
    return NextResponse.json({ exercise, matchQuality: exercise ? 'ai' : 'none', reasoning: parsed.reasoning });
  } catch (err) {
    // сеть/лимиты/невалидный ключ — не роняем фичу целиком
    const exercise = fallbackMatch(exercises, errorType, angle, distance);
    return NextResponse.json({ exercise, matchQuality: exercise ? 'ai_fallback' : 'none' });
  }
}
