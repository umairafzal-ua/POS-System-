import { create } from 'zustand'

interface User {
  id: number
  username: string
  role: string
  full_name: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      const result = await window.api.auth.login(username, password)
      if (result.success) {
        set({ user: result.user, isAuthenticated: true })
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true })
  }
}))
