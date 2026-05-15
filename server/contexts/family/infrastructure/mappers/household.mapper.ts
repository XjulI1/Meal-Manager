import type { HouseholdRow, NewHouseholdRow } from '../../../../database/schema/households'
import { Household } from '../../domain/entities/household.entity'
import { InviteCode } from '../../domain/value-objects/invite-code.vo'

export const HouseholdMapper = {
  toDomain(row: HouseholdRow): Household {
    return Household.rehydrate({
      id: row.id,
      name: row.name,
      inviteCode: InviteCode.fromString(row.inviteCode),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  },

  toPersistence(household: Household): NewHouseholdRow {
    return {
      id: household.id,
      name: household.name,
      inviteCode: household.inviteCode.value,
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
    }
  },
}
