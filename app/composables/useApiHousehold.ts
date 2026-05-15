import type { CreateHouseholdDto, JoinHouseholdDto } from '../../shared/dto/family'

export interface HouseholdSummary {
  id: string
  name: string
  inviteCode: string
}

export interface HouseholdMemberView {
  userId: string
  email: string
  joinedAt: string
}

export interface CurrentHousehold extends HouseholdSummary {
  members: HouseholdMemberView[]
}

export function useApiHousehold() {
  async function create(payload: CreateHouseholdDto): Promise<HouseholdSummary> {
    return $fetch<HouseholdSummary>('/api/households', {
      method: 'POST',
      body: payload,
    })
  }

  async function join(payload: JoinHouseholdDto): Promise<HouseholdSummary> {
    return $fetch<HouseholdSummary>('/api/households/join', {
      method: 'POST',
      body: payload,
    })
  }

  async function leave(): Promise<{ householdDeleted: boolean }> {
    return $fetch<{ householdDeleted: boolean }>('/api/households/leave', {
      method: 'POST',
    })
  }

  async function fetchCurrent(): Promise<CurrentHousehold | null> {
    try {
      return await $fetch<CurrentHousehold>('/api/households/me')
    }
    catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404) return null
      throw error
    }
  }

  return { create, join, leave, fetchCurrent }
}
