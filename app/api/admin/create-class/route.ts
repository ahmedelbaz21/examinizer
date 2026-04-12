import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { className, yearOfStudy, majorId } = await req.json();

  const { data, error } = await supabaseAdmin
    .from('classes')
    .insert({ class_name: className, year_of_study: yearOfStudy, major_id: majorId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, data });
}