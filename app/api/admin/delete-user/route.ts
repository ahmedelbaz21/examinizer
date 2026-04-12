import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}