import type { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import type { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'

export interface Container {
  registerUser: RegisterUserUseCase
  loginUser: LoginUserUseCase
}

declare module 'h3' {
  interface H3EventContext {
    container: Container
    user?: { id: string, email: string }
  }
}

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
  }
}

export {}
