export interface GeneratedToken {
  plaintext: string
  hash: string
  prefix: string
}

export interface ITokenGenerator {
  generate(): GeneratedToken
  hash(plaintext: string): string
}
