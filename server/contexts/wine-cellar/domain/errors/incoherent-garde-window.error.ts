export class IncoherentGardeWindowError extends Error {
  override readonly name = 'IncoherentGardeWindowError'
  constructor(readonly gardeMin: number, readonly gardeMax: number) {
    super(`Garde window is incoherent: gardeMin (${gardeMin}) must be ≤ gardeMax (${gardeMax}).`)
  }
}
