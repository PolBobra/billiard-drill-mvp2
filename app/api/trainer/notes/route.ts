import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getTrainerStudentAccess } from '@/lib/trainerAccess';

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { studentId, shotLogId, note } = await req.json();
  if (!studentId || !shotLogId || !note || typeof note !== 'string' || !note.trim()) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const access = await getTrainerStudentAccess(admin, auth.userId, studentId);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 });
  if (!access.canWrite) {
    return NextResponse.json({ error: 'Нет активной подписки with_trainer у ученика' }, { status: 403 });
  }

  const { error } = await admin.from('trainer_notes').insert({
    trainer_id: auth.userId,
    student_id: studentId,
    shot_log_id: shotLogId,
    note: note.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Ученик отмечает заметку прочитанной. Отдельный маршрут вместо прямого
// update от клиента, чтобы студент не мог заодно отредактировать text заметки —
// RLS на trainer_notes не различает колонки при update.
export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const { noteId } = await req.json();
  if (!noteId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('trainer_notes')
    .update({ read_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('student_id', auth.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
