import type { IUserRepository } from '../../domain/ports/user-repository.port'

export interface GetUserAiAccessInput {
  userId: string
}

export interface GetUserAiAccessResult {
  aiEnabled: boolean
}

/**
 * Authoritative AI-access check used by the AI route guard. Reads the flag
 * straight from the user repository so that toggling `ai_enabled` in the
 * database takes effect on the next request (no need to re-login).
 */
export class GetUserAiAccessUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(input: GetUserAiAccessInput): Promise<GetUserAiAccessResult> {
    const user = await this.users.findById(input.userId)
    return { aiEnabled: user?.aiEnabled ?? false }
  }
}
