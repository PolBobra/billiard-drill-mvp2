import { NextResponse } from 'next/server';
import { requireUser, isUserFail } from '@/lib/userAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getTrainerStudentAccess } from '@/lib/trainerAccess';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (isUserFail(auth)) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

  const studentId = params.id;
  const admin = getSupabaseAdmin();
  const access = await getTrainerStudentAccess(admin, auth.userId, studentId);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 });

  let query = admin
    .from('shot_logs')
    .select('id, error_type, angle, distance, completed, diagram, created_at')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);
  // подписка неактивна — "замораживаем" вид на момент отключения, новые
  // записи ученика тренеру не показываем
  if (access.cutoff) query = query.lte('created_at', access.cutoff);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: notes } = await admin
    .from('trainer_notes')
    .select('id, shot_log_id, note, created_at, read_at')
    .eq('trainer_id', auth.userId)
    .eq('student_id', studentId);

  return NextResponse.json({ shotLogs: data, notes: notes || [], canWrite: access.canWrite });
}
