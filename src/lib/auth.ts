import { supabase } from './supabaseClient';

export type UserRole = 'Admin' | 'Instructor' | 'Student';

export async function getCurrentUserWithRole(): Promise<{
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, role_id, roles(role_name)')
  .eq('user_id', user.id)
  .single();

if (!profile) return null;

// Get role from role_id directly as fallback
const roleMap: Record<number, UserRole> = {
  1: 'Admin',
  2: 'Instructor',
  3: 'Student',
};

return {
  userId: user.id,
  fullName: profile.full_name,
  email: user.email!,
  role: (profile.roles as any)?.role_name as UserRole ?? roleMap[profile.role_id],
};
}
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}