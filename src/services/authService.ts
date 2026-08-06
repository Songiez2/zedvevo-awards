// Authentication Service - Real Supabase Auth Integration
import { supabase, isConfigured, type Profile } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { ADMIN_EMAIL } from '@/lib/authHelpers'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  username?: string
}

export interface SignInData {
  email: string
  password: string
}

class AuthService {
  // Sign up new user
  async signUp({ email, password, fullName, username }: SignUpData): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' }
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            username: username || email.split('@')[0],
          },
        },
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' }
      }

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        username: username || email.split('@')[0],
        role: 'user',
      })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return { success: false, error: 'Failed to create profile' }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message || 'Failed to sign up' }
    }
  }

  // Sign in user
  async signIn({ email, password }: SignInData): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to sign in' }
      }

      // Fetch profile to update store
      await this.fetchAndSetUser(authData.user.id)

      return { success: true }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message || 'Failed to sign in' }
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (!isConfigured) {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().setArtist(null)
      return
    }

    await supabase.auth.signOut()
    useAuthStore.getState().setUser(null)
    useAuthStore.getState().setArtist(null)
  }

  // Fetch user profile and update store
  async fetchAndSetUser(userId?: string): Promise<Profile | null> {
    if (!isConfigured) {
      return null
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const id = userId || authUser?.id

      if (!id) {
        return null
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !profile) {
        return null
      }

      // Check if admin by email
      const isAdminEmail = profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      if (isAdminEmail && profile.role !== 'super_admin') {
        await supabase.from('profiles').update({ role: 'super_admin' }).eq('id', id)
        profile.role = 'super_admin'
      }

      useAuthStore.getState().setUser(profile)

      // Fetch artist data if user is an artist
      if (profile.is_artist || profile.role === 'artist') {
        await this.fetchAndSetArtist(id)
      }

      return profile
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Fetch artist profile
  async fetchAndSetArtist(userId: string): Promise<any | null> {
    if (!isConfigured) {
      return null
    }

    try {
      const { data: artist, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !artist) {
        return null
      }

      useAuthStore.getState().setArtist(artist)
      return artist
    } catch (error) {
      console.error('Error fetching artist:', error)
      return null
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      // Refresh user data
      await this.fetchAndSetUser()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Update password
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Check if user has purchased an item
  async hasPurchased(itemType: string, itemId: string): Promise<boolean> {
    if (!isConfigured) {
      return false
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return false
    }

    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('status', 'completed')
      .single()

    return !!data
  }

  // Get current user
  getCurrentUser(): Profile | null {
    return useAuthStore.getState().user
  }

  // Check if user is admin
  isAdmin(): boolean {
    const state = useAuthStore.getState()
    return state.isAdmin || state.isSuperAdmin
  }

  // Check if user is artist
  isArtist(): boolean {
    return useAuthStore.getState().isArtist
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated
  }
}

export const authService = new AuthService()
export default authService
