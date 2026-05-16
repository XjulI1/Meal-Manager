/**
 * Extension point allowing other bounded contexts to perform per-household
 * setup work right after a household is created (and within the same logical
 * transaction). Implementations live in the calling context's infrastructure
 * layer (e.g. ingredients seeds the default catalog).
 *
 * A failure thrown by any initializer MUST roll back the household creation.
 */
export interface IHouseholdInitializer {
  initialize(householdId: string): Promise<void>
}
