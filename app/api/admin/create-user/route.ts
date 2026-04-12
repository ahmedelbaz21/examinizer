import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { email, password, fullName, roleId, majorId, classId, yearOfStudy } = await req.json();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const profileData: any = {
    user_id: data.user.id,
    full_name: fullName,
    role_id: roleId,
  };

  // Only add student fields for students
  if (roleId === 3) {
    profileData.major_id = majorId || null;
    profileData.class_id = classId || null;
    profileData.year_of_study = yearOfStudy || null;
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert(profileData);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  // Enroll student in class
  if (roleId === 3 && classId) {
    await supabaseAdmin
      .from('class_enrollments')
      .insert({ class_id: classId, student_id: data.user.id });
  }

  // Assign instructor to major
  if (roleId === 2 && majorId) {
    await supabaseAdmin
      .from('instructor_majors')
      .insert({ instructor_id: data.user.id, major_id: majorId });
  }

  return NextResponse.json({ success: true });
}