import { describe, expect, it } from 'vitest'
import {
  InvalidSlotPositionError,
  SlotPosition,
} from '../../../server/contexts/wine-cellar/domain/value-objects/slot-position.vo'

describe('SlotPosition', () => {
  it('creates a valid position', () => {
    const pos = SlotPosition.create({ rowId: 'row-1', depth: 'back', index: 3 })
    expect(pos.rowId).toBe('row-1')
    expect(pos.depth).toBe('back')
    expect(pos.index).toBe(3)
  })

  it('rejects an index below 1', () => {
    expect(() => SlotPosition.create({ rowId: 'row-1', depth: 'back', index: 0 }))
      .toThrow(InvalidSlotPositionError)
  })

  it('rejects a non-integer index', () => {
    expect(() => SlotPosition.create({ rowId: 'row-1', depth: 'front', index: 1.5 }))
      .toThrow(InvalidSlotPositionError)
  })

  it('rejects a missing rowId', () => {
    expect(() => SlotPosition.create({ rowId: '', depth: 'front', index: 1 }))
      .toThrow(InvalidSlotPositionError)
  })

  it('compares by value', () => {
    const a = SlotPosition.create({ rowId: 'row-1', depth: 'back', index: 2 })
    const b = SlotPosition.create({ rowId: 'row-1', depth: 'back', index: 2 })
    const c = SlotPosition.create({ rowId: 'row-1', depth: 'front', index: 2 })
    expect(a.equals(b)).toBe(true)
    expect(a.equals(c)).toBe(false)
  })
})
