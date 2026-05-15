import { z } from 'zod'

export const CreateHouseholdSchema = z.object({
  name: z.string().min(1).max(120).trim(),
})
export type CreateHouseholdDto = z.infer<typeof CreateHouseholdSchema>

export const JoinHouseholdSchema = z.object({
  inviteCode: z.string().min(6).max(32).trim(),
})
export type JoinHouseholdDto = z.infer<typeof JoinHouseholdSchema>

export const HouseholdViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  inviteCode: z.string(),
  memberCount: z.number().int().nonnegative(),
})
export type HouseholdView = z.infer<typeof HouseholdViewSchema>
