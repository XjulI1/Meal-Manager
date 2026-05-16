export interface PersonalAccessTokenProps {
  id: string
  userId: string
  householdId: string
  name: string
  tokenHash: string
  prefix: string
  createdAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
}

export class PersonalAccessToken {
  readonly id: string
  readonly userId: string
  readonly householdId: string
  readonly name: string
  readonly tokenHash: string
  readonly prefix: string
  readonly createdAt: Date
  private _lastUsedAt: Date | null
  private _revokedAt: Date | null

  private constructor(props: PersonalAccessTokenProps) {
    this.id = props.id
    this.userId = props.userId
    this.householdId = props.householdId
    this.name = props.name
    this.tokenHash = props.tokenHash
    this.prefix = props.prefix
    this.createdAt = props.createdAt
    this._lastUsedAt = props.lastUsedAt
    this._revokedAt = props.revokedAt
  }

  get lastUsedAt(): Date | null {
    return this._lastUsedAt
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  get isActive(): boolean {
    return this._revokedAt === null
  }

  static create(props: {
    id: string
    userId: string
    householdId: string
    name: string
    tokenHash: string
    prefix: string
    now?: Date
  }): PersonalAccessToken {
    const name = props.name.trim()
    if (name.length === 0 || name.length > 80) {
      throw new Error('Personal access token name must be 1–80 characters long.')
    }
    if (props.prefix.length !== 8) {
      throw new Error('Personal access token prefix must be exactly 8 characters.')
    }
    return new PersonalAccessToken({
      id: props.id,
      userId: props.userId,
      householdId: props.householdId,
      name,
      tokenHash: props.tokenHash,
      prefix: props.prefix,
      createdAt: props.now ?? new Date(),
      lastUsedAt: null,
      revokedAt: null,
    })
  }

  static rehydrate(props: PersonalAccessTokenProps): PersonalAccessToken {
    return new PersonalAccessToken(props)
  }

  revoke(now: Date = new Date()): void {
    if (this._revokedAt !== null) return
    this._revokedAt = now
  }

  markUsed(now: Date = new Date()): void {
    this._lastUsedAt = now
  }
}
