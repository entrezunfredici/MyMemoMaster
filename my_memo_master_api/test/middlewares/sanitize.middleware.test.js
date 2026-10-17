const sanitize = require('../../middlewares/sanitize.middleware')

const { stripHtml } = sanitize

const run = (body) => {
  const req = { body }
  const next = jest.fn()
  sanitize(req, {}, next)
  expect(next).toHaveBeenCalledTimes(1)
  return req.body
}

describe('sanitize.middleware — texte mathématique conservé', () => {
  test.each([
    ['si x<2 et y>3', 'si x<2 et y>3'],
    ['x<2 et y>3', 'x<2 et y>3'],
    ['0 < a et b > 1', '0 < a et b > 1'],
    ['a<b et c>d', 'a<b et c>d'], // « b » est aussi un élément HTML, mais sans « = » ni fermeture directe
    ['$x<y$ et $y>z$', '$x<y$ et $y>z$'],
    ['5<x>3', '5<x>3'],
    ['u<v>w', 'u<v>w'],
    ['\\frac{a}{b} < 1 > 0', '\\frac{a}{b} < 1 > 0'],
    ['i < n and n > 0', 'i < n and n > 0'],
    ['<-- flèche -->', '<-- flèche -->'],
    ['a <= b >= c', 'a <= b >= c'],
    ['E = mc^2 < 10 et > 0', 'E = mc^2 < 10 et > 0'],
  ])('« %s » est inchangé', (input, expected) => {
    expect(stripHtml(input)).toBe(expected)
  })
})

describe('sanitize.middleware — balises HTML retirées', () => {
  test.each([
    ['<b>SVT</b>', 'SVT'],
    ['Un texte <script>alert(1)</script> source.', 'Un texte alert(1) source.'],
    ['<img src=x onerror=alert(1)>', ''],
    ['<svg/onload=alert(1)>', ''],
    ['<a href="https://evil.test" onclick="x()">lien</a>', 'lien'],
    ['<IMG SRC=x ONERROR=alert(1)>', ''],
    ['<iframe src=//evil.test></iframe>', ''],
    ['avant<br/>après', 'avantaprès'],
    ['avant<br>après', 'avantaprès'],
    ['<p>un</p><p>deux</p>', 'undeux'],
    ['<!-- commentaire --> texte', ' texte'],
    ['<!DOCTYPE html><html>x</html>', 'x'],
    ['<?xml version="1.0"?>texte', 'texte'],
    ['<style>body{display:none}</style>', 'body{display:none}'],
    ['<input autofocus onfocus=alert(1)>', ''],
  ])('« %s » → « %s »', (input, expected) => {
    expect(stripHtml(input)).toBe(expected)
  })

  test('une balise reconstituée par le retrait d’une autre est retirée aussi', () => {
    expect(stripHtml('<scr<script>ipt>alert(1)</scr</script>ipt>')).toBe('alert(1)')
    expect(stripHtml('<im<b>g src=x onerror=alert(1)>')).toBe('')
  })

  test('balises mêlées à du texte mathématique : seules les balises partent', () => {
    expect(stripHtml('si x<2 <b>et</b> y>3')).toBe('si x<2 et y>3')
    expect(stripHtml('<img src=x onerror=alert(1)>x<2 et y>3')).toBe('x<2 et y>3')
  })
})

describe('sanitize.middleware — corps de requête', () => {
  test('nettoie récursivement objets et tableaux, supprime les espaces autour, laisse les autres types', () => {
    const body = run({
      statement: '  Résoudre x<2 et y>3 <b>vite</b>  ',
      options: [{ text: '<i>A</i>', correct: true }, { text: 'x<y et y>z', correct: false }],
      meta: { count: 3, ok: false, nothing: null, title: '<script>x</script>t' },
    })
    expect(body).toEqual({
      statement: 'Résoudre x<2 et y>3 vite',
      options: [{ text: 'A', correct: true }, { text: 'x<y et y>z', correct: false }],
      meta: { count: 3, ok: false, nothing: null, title: 'xt' },
    })
  })

  test('sans corps : passe au suivant sans erreur', () => {
    const req = {}
    const next = jest.fn()
    sanitize(req, {}, next)
    expect(next).toHaveBeenCalled()
    expect(req.body).toBeUndefined()
  })
})
