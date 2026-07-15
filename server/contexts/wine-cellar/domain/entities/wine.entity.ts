import { IncoherentGardeWindowError } from '../errors/incoherent-garde-window.error'
import type { WineColor } from '../value-objects/wine-color.vo'
import type { WineRegion } from '../value-objects/wine-region.vo'

export interface WineProps {
  id: string
  householdId: string
  name: string
  domain: string | null
  country: string | null
  region: WineRegion | null
  appellation: string | null
  vintage: number | null
  color: WineColor
  gardeMin: number | null
  gardeMax: number | null
  comment: string | null
  aromas: string | null
  foodPairings: string | null
  aiEnrichedAt: Date | null
  photoUrl: string | null
  rating: number | null
  createdAt: Date
  updatedAt: Date
}

export type WineAttributes = Omit<WineProps, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>

export class Wine {
  readonly id: string
  readonly householdId: string
  readonly name: string
  readonly domain: string | null
  readonly country: string | null
  readonly region: WineRegion | null
  readonly appellation: string | null
  readonly vintage: number | null
  readonly color: WineColor
  readonly gardeMin: number | null
  readonly gardeMax: number | null
  readonly comment: string | null
  readonly aromas: string | null
  readonly foodPairings: string | null
  readonly aiEnrichedAt: Date | null
  readonly photoUrl: string | null
  readonly rating: number | null
  readonly createdAt: Date
  readonly updatedAt: Date

  private constructor(props: WineProps) {
    this.id = props.id
    this.householdId = props.householdId
    this.name = props.name
    this.domain = props.domain
    this.country = props.country
    this.region = props.region
    this.appellation = props.appellation
    this.vintage = props.vintage
    this.color = props.color
    this.gardeMin = props.gardeMin
    this.gardeMax = props.gardeMax
    this.comment = props.comment
    this.aromas = props.aromas
    this.foodPairings = props.foodPairings
    this.aiEnrichedAt = props.aiEnrichedAt
    this.photoUrl = props.photoUrl
    this.rating = props.rating
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: {
    id: string
    householdId: string
    attributes: WineAttributes
    now?: Date
  }): Wine {
    Wine.assertGardeWindow(props.attributes.gardeMin, props.attributes.gardeMax)
    const now = props.now ?? new Date()
    return new Wine({
      id: props.id,
      householdId: props.householdId,
      ...props.attributes,
      name: props.attributes.name.trim(),
      createdAt: now,
      updatedAt: now,
    })
  }

  static rehydrate(props: WineProps): Wine {
    return new Wine(props)
  }

  withAttributes(attributes: WineAttributes, now: Date = new Date()): Wine {
    Wine.assertGardeWindow(attributes.gardeMin, attributes.gardeMax)
    return new Wine({
      id: this.id,
      householdId: this.householdId,
      ...attributes,
      name: attributes.name.trim(),
      createdAt: this.createdAt,
      updatedAt: now,
    })
  }

  private static assertGardeWindow(gardeMin: number | null, gardeMax: number | null): void {
    if (gardeMin !== null && gardeMax !== null && gardeMin > gardeMax) {
      throw new IncoherentGardeWindowError(gardeMin, gardeMax)
    }
  }
}
