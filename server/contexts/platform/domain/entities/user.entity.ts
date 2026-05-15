export interface UserProps {
  id: string
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export class User {
  readonly id: string
  readonly email: string
  readonly passwordHash: string
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: UserProps) {
    this.id = props.id
    this.email = props.email
    this.passwordHash = props.passwordHash
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: { id: string, email: string, passwordHash: string, now?: Date }): User {
    const now = props.now ?? new Date()
    return new User({
      id: props.id,
      email: User.normalizeEmail(props.email),
      passwordHash: props.passwordHash,
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: UserProps): User {
    return new User({ ...props, email: User.normalizeEmail(props.email) })
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }
}
