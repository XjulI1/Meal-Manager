import { describe, expect, it } from 'vitest'
import { parseIngredientLine, parseRecipeJsonLd } from '../../server/contexts/catalog/infrastructure/recipe-json-ld'

describe('parseIngredientLine', () => {
  it('splits "200 g de farine" into quantity + name', () => {
    expect(parseIngredientLine('200 g de farine')).toEqual({
      name: 'farine',
      quantity: { value: 200, unit: 'g' },
      raw: '200 g de farine',
    })
  })

  it('treats a count with no unit as a "unit" quantity', () => {
    expect(parseIngredientLine('3 oeufs')).toEqual({
      name: 'oeufs',
      quantity: { value: 3, unit: 'unit' },
      raw: '3 oeufs',
    })
  })

  it('supports decimal comma and litres', () => {
    expect(parseIngredientLine('1,5 l de lait')).toEqual({
      name: 'lait',
      quantity: { value: 1.5, unit: 'l' },
      raw: '1,5 l de lait',
    })
  })

  it('returns just a name when there is no leading quantity', () => {
    expect(parseIngredientLine('Sel')).toEqual({ name: 'Sel', raw: 'Sel' })
  })
})

describe('parseRecipeJsonLd', () => {
  it('parses a schema.org Recipe block', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      'name': 'Tarte aux pommes',
      'recipeYield': '4 parts',
      'recipeIngredient': ['200 g de farine', '3 oeufs'],
      'recipeInstructions': [
        { '@type': 'HowToStep', text: 'Mélanger' },
        { '@type': 'HowToStep', text: 'Cuire' },
      ],
    })}</script></head><body></body></html>`

    const draft = parseRecipeJsonLd(html)
    expect(draft).not.toBeNull()
    expect(draft!.title).toBe('Tarte aux pommes')
    expect(draft!.servings).toBe(4)
    expect(draft!.instructions).toBe('Mélanger\nCuire')
    expect(draft!.ingredients).toHaveLength(2)
    expect(draft!.ingredients[0]).toMatchObject({ name: 'farine', quantity: { value: 200, unit: 'g' } })
  })

  it('finds a Recipe nested inside an @graph', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [
        { '@type': 'WebPage', name: 'page' },
        { '@type': 'Recipe', name: 'Soupe', recipeIngredient: ['1 oignon'], recipeInstructions: 'Cuire' },
      ],
    })}</script>`
    const draft = parseRecipeJsonLd(html)
    expect(draft?.title).toBe('Soupe')
    expect(draft?.instructions).toBe('Cuire')
  })

  it('returns null when there is no Recipe', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ '@type': 'WebSite', name: 'x' })}</script>`
    expect(parseRecipeJsonLd(html)).toBeNull()
  })

  it('ignores malformed JSON-LD blocks', () => {
    const html = '<script type="application/ld+json">{ not json }</script>'
    expect(parseRecipeJsonLd(html)).toBeNull()
  })
})
