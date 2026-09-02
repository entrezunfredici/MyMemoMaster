const { chunkText, DEFAULT_MAX_CHUNK_LENGTH } = require('../../helpers/textChunker')

describe('chunkText', () => {
  it('chunkText - texte vide ou blanc - retourne un tableau vide', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n\n  ')).toEqual([])
    expect(chunkText(null)).toEqual([])
    expect(chunkText(undefined)).toEqual([])
  })

  it('chunkText - texte court (un seul paragraphe) - retourne un unique chunk', () => {
    const text = 'Un paragraphe court.'
    expect(chunkText(text)).toEqual([text])
  })

  it('chunkText - plusieurs paragraphes tenant dans la limite - un seul chunk, séparateur conservé', () => {
    const text = 'Premier paragraphe.\n\nDeuxième paragraphe.'
    const chunks = chunkText(text, { maxChunkLength: 1000 })
    expect(chunks).toEqual(['Premier paragraphe.\n\nDeuxième paragraphe.'])
  })

  it('chunkText - paragraphes dépassant la limite cumulée - répartis sur plusieurs chunks', () => {
    const paragraphs = ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)]
    const text = paragraphs.join('\n\n')
    const chunks = chunkText(text, { maxChunkLength: 50 })

    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(50))
    // Aucune perte de contenu : chaque paragraphe se retrouve entier dans un chunk
    paragraphs.forEach((p) => expect(chunks.some((c) => c.includes(p))).toBe(true))
  })

  it('chunkText - paragraphe unique dépassant la limite - redécoupé par phrases', () => {
    const sentence1 = 'Phrase numéro un assez longue pour compter.'
    const sentence2 = 'Phrase numéro deux également assez longue.'
    const paragraph = `${sentence1} ${sentence2}`
    const chunks = chunkText(paragraph, { maxChunkLength: sentence1.length + 5 })

    expect(chunks.length).toBe(2)
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(sentence1.length + 5))
  })

  it('chunkText - une phrase unique dépassant à elle seule la limite - découpage par force, aucun chunk ne dépasse la limite', () => {
    const hugeSentence = 'x'.repeat(500) + '.'
    const chunks = chunkText(hugeSentence, { maxChunkLength: 100 })

    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(100))
    expect(chunks.join('')).toBe(hugeSentence)
  })

  it('chunkText - aucune option fournie - utilise DEFAULT_MAX_CHUNK_LENGTH', () => {
    const text = 'x'.repeat(DEFAULT_MAX_CHUNK_LENGTH + 100)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(DEFAULT_MAX_CHUNK_LENGTH))
  })

  it('chunkText - texte réel multi-paragraphes - termine et conserve tout le contenu (pas de boucle infinie, pas de perte)', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Paragraphe ${i} : ${'contenu '.repeat(50)}`).join('\n\n')
    const chunks = chunkText(text, { maxChunkLength: 300 })

    expect(chunks.length).toBeGreaterThan(1)
    const rebuilt = chunks.join(' ')
    for (let i = 0; i < 20; i++) {
      expect(rebuilt).toContain(`Paragraphe ${i} :`)
    }
  })
})
