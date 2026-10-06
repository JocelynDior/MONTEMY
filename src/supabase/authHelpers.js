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

// Where a user should land after logging in:
// admins -> admin dashboard, unverified users -> pending page, everyone else -> their dashboard
export function homeRouteFor(profile) {
  if (!profile || !ROLE_ROUTES[profile.role]) return '/login'
  if (profile.role === 'admin') return ROLE_ROUTES.admin
  if (!profile.is_verified) return '/pending-verification'
  return ROLE_ROUTES[profile.role]
}

// Reads the signed-in user's profile row from the users table.
// Returns { role, is_verified, name, org_id } or null if there is no profile.
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('role, is_verified, name, org_id')
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
