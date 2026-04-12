import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { userId, roleId, isActive } = await req.json();

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role_id: roleId, is_active: isActive })
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}