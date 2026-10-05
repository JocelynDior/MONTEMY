import { supabase } from './client'

// Where each role lands after login
export const ROLE_ROUTES = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  principal: '/principal/dashboard',
  tutor: '/tutor/dashboard',
  schoolmember: '/schoolmember/dashboard',
  admin: '/admin/dashboard',
}

// Reads the signed-in user's profile row from the users table.
// Returns { role, is_verified, name } or null if there is no profile.
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('role, is_verified, name')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('getProfile failed:', error)
    return null
  }
  return data
}

export async function logout() {
  await supabase.auth.signOut()
  localStorage.removeItem('montemy_role')
}
