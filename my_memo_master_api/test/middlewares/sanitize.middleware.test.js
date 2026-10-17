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

describe('sanitize.middleware — résistance aux entrées adverses (ReDoS)', () => {
  // Chaque entrée aurait pris plusieurs secondes (voire minutes) avec les expressions quadratiques
  // d'origine. Le seuil est large (CI lente) mais sans commune mesure avec ce temps.
  const MAX_MS = 1500
  const timed = (input) => {
    const start = process.hrtime.bigint()
    const out = stripHtml(input)
    return { out, ms: Number(process.hrtime.bigint() - start) / 1e6 }
  }

  test.each([
    ['attributs sans fermeture', '<b ' + '= '.repeat(60000)],
    ['espaces sans fermeture', '<b' + ' '.repeat(120000)],
    ['commentaires non fermés', '<!--'.repeat(40000)],
    ['instructions non fermées', '<?'.repeat(60000)],
    ['balises imbriquées non fermées', '<b x='.repeat(25000)],
  ])('%s : traité en temps borné et sans perte de texte', (_label, input) => {
    const { out, ms } = timed(input)
    expect(ms).toBeLessThan(MAX_MS)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })

  test('un commentaire fermé est toujours retiré, un non fermé est conservé', () => {
    expect(stripHtml('a<!-- x -->b')).toBe('ab')
    expect(stripHtml('a<!-- x')).toBe('a<!-- x')
    expect(stripHtml('a<?php x ?>b')).toBe('ab')
    expect(stripHtml('a<?php x')).toBe('a<?php x')
  })

  test('« <!--> » n’est pas un commentaire complet', () => {
    expect(stripHtml('a<!-->b')).toBe('a<!-->b')
  })
})

describe('sanitize.middleware — injection de propriété (clé __proto__)', () => {
  test('une clé « __proto__ » reste une donnée du corps et ne change pas son prototype', () => {
    const body = JSON.parse('{"__proto__": {"isAdmin": true}, "name": "<b>x</b>"}')
    const out = run(body)
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype)
    expect(out.isAdmin).toBeUndefined()
    expect(Object.keys(out)).toEqual(['__proto__', 'name'])
    expect(out.name).toBe('x')
  })

  test('aucune pollution du prototype global', () => {
    run(JSON.parse('{"__proto__": {"polluted": "oui"}, "constructor": {"prototype": {"polluted": "oui"}}}'))
    expect({}.polluted).toBeUndefined()
  })
})
