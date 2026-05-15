import { useDb } from '../database/client'
import { CreateHouseholdUseCase } from '../contexts/family/application/use-cases/create-household.use-case'
import { GetCurrentHouseholdUseCase } from '../contexts/family/application/use-cases/get-current-household.use-case'
import { JoinHouseholdUseCase } from '../contexts/family/application/use-cases/join-household.use-case'
import { LeaveHouseholdUseCase } from '../contexts/family/application/use-cases/leave-household.use-case'
import { CryptoInviteCodeGenerator } from '../contexts/family/infrastructure/crypto-invite-code-generator'
import { DrizzleHouseholdRepository } from '../contexts/family/infrastructure/repositories/drizzle-household.repository'
import { LoginUserUseCase } from '../contexts/platform/application/use-cases/login-user.use-case'
import { RegisterUserUseCase } from '../contexts/platform/application/use-cases/register-user.use-case'
import { Argon2PasswordHasher } from '../contexts/platform/infrastructure/hashers/argon2-password-hasher'
import { DrizzleUserRepository } from '../contexts/platform/infrastructure/repositories/drizzle-user.repository'
import type { Container } from '../types/container'

export default defineNitroPlugin((nitro) => {
  let containerInstance: Container | null = null

  nitro.hooks.hook('request', (event) => {
    if (!containerInstance) {
      containerInstance = buildContainer()
    }
    event.context.container = containerInstance
  })
})

function buildContainer(): Container {
  const db = useDb()

  // platform
  const userRepo = new DrizzleUserRepository(db)
  const hasher = new Argon2PasswordHasher()

  // family
  const householdRepo = new DrizzleHouseholdRepository(db)
  const inviteCodes = new CryptoInviteCodeGenerator()

  return {
    registerUser: new RegisterUserUseCase(userRepo, hasher),
    loginUser: new LoginUserUseCase(userRepo, hasher),
    createHousehold: new CreateHouseholdUseCase(householdRepo, inviteCodes),
    joinHousehold: new JoinHouseholdUseCase(householdRepo),
    leaveHousehold: new LeaveHouseholdUseCase(householdRepo),
    getCurrentHousehold: new GetCurrentHouseholdUseCase(householdRepo),
  }
}
