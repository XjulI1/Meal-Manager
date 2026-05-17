import { z } from 'zod'

export const CreatePersonalAccessTokenSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80, 'Name is too long.'),
})

export type CreatePersonalAccessTokenDto = z.infer<typeof CreatePersonalAccessTokenSchema>

export const PersonalAccessTokenViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prefix: z.string().length(8),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
})

export type PersonalAccessTokenView = z.infer<typeof PersonalAccessTokenViewSchema>

export const CreatedPersonalAccessTokenSchema = z.object({
  plaintext: z.string(),
  token: PersonalAccessTokenViewSchema,
})

export type CreatedPersonalAccessTokenView = z.infer<typeof CreatedPersonalAccessTokenSchema>
