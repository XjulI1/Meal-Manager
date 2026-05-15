import type { LoginUserDto, RegisterUserDto } from '../../shared/dto/auth'

interface AuthSuccess {
  user: { id: string, email: string }
}

export function useApiAuth() {
  const { fetch: refreshSession, clear: clearSession } = useUserSession()

  async function register(payload: RegisterUserDto): Promise<AuthSuccess> {
    const res = await $fetch<AuthSuccess>('/api/auth/register', {
      method: 'POST',
      body: payload,
    })
    await refreshSession()
    return res
  }

  async function login(payload: LoginUserDto): Promise<AuthSuccess> {
    const res = await $fetch<AuthSuccess>('/api/auth/login', {
      method: 'POST',
      body: payload,
    })
    await refreshSession()
    return res
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clearSession()
  }

  return { register, login, logout }
}
