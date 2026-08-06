// Helper functions for authentication and authorization

export const ADMIN_EMAIL = 'topkuchalo@gmail.com'

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

export function isSuperAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

// Check if user should be admin based on email
export function shouldBeAdmin(email: string, isFirstUser: boolean = false): boolean {
  return isAdminEmail(email) || isFirstUser
}
