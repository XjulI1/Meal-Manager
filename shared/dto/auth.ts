import { z } from 'zod'

export const RegisterUserSchema = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters long.')
    .max(256, 'Password is too long.'),
})

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>

export const LoginUserSchema = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(256),
})

export type LoginUserDto = z.infer<typeof LoginUserSchema>

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  householdId: z.string().uuid().nullable(),
})

export type SessionUserDto = z.infer<typeof SessionUserSchema>
