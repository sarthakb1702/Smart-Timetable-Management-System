import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { faculty_id, room_id, day_of_week, start_time, term_id } = await request.json();

  // Check Faculty Time Collision
  const { data: facultyClash } = await supabase
    .from('timetable')
    .select('id')
    .eq('term_id', term_id)
    .eq('faculty_id', faculty_id)
    .eq('day_of_week', day_of_week)
    .eq('start_time', start_time)
    .maybeSingle();

  if (facultyClash) {
    return NextResponse.json({ clash: true, reason: 'Faculty is already assigned to another slot at this time.' }, { status: 409 });
  }

  // Check Room Time Collision
  const { data: roomClash } = await supabase
    .from('timetable')
    .select('id')
    .eq('term_id', term_id)
    .eq('room_id', room_id)
    .eq('day_of_week', day_of_week)
    .eq('start_time', start_time)
    .maybeSingle();

  if (roomClash) {
    return NextResponse.json({ clash: true, reason: 'Room is already occupied at this time.' }, { status: 409 });
  }

  return NextResponse.json({ clash: false });
}