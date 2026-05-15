export interface IPasswordHasher {
  hash(plaintext: string): Promise<string>
  verify(hashed: string, plaintext: string): Promise<boolean>
}
