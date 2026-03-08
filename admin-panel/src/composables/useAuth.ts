import { ref, computed } from 'vue'
import { apiBase } from '../utils/api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

const token = ref<string | null>(localStorage.getItem('token'))
const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  async function login(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (data.success) {
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }

    return { success: data.success, message: data.message }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, login, logout }
}
