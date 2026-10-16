const { algebraicallyEqual } = require('../../helpers/algebraicEquivalence')

describe('algebraicEquivalence — algebraicallyEqual', () => {
  describe('commutativité', () => {
    it('a+b ≡ b+a', () => {
      expect(algebraicallyEqual('a+b', 'b+a')).toBe(true)
    })

    it('a*b ≡ b*a', () => {
      expect(algebraicallyEqual('a*b', 'b*a')).toBe(true)
    })

    it('équation symétrique : U=RI ≡ RI=U (et commutativité du produit)', () => {
      expect(algebraicallyEqual('U=R*I', 'I*R=U')).toBe(true)
    })
  })

  describe('division comme puissance inverse', () => {
    it('a/b ≡ a*b^-1', () => {
      expect(algebraicallyEqual('a/b', 'a*b^-1')).toBe(true)
    })

    it('over(F, S) ≡ F*S^-1 (raccourci V1 vs LaTeX-like)', () => {
      expect(algebraicallyEqual('over(F, S)', 'F*S^-1')).toBe(true)
    })

    it('\\frac{F}{S} ≡ F/S', () => {
      expect(algebraicallyEqual('\\frac{F}{S}', 'F/S')).toBe(true)
    })
  })

  describe('combinaison de termes et facteurs semblables', () => {
    it('x+x ≡ 2x', () => {
      expect(algebraicallyEqual('x+x', '2x')).toBe(true)
    })

    it('a*a ≡ a^2', () => {
      expect(algebraicallyEqual('a*a', 'a^2')).toBe(true)
    })

    it('a*a^-1 ≡ 1 (les exposants se combinent et s’annulent)', () => {
      expect(algebraicallyEqual('a*a^-1', '1')).toBe(true)
    })
  })

  describe('racines', () => {
    it('sqrt(x) ≡ x^(1/2)', () => {
      expect(algebraicallyEqual('sqrt(x)', 'x^0.5')).toBe(true)
    })

    it('nsqrt(2, x) ≡ sqrt(x)', () => {
      expect(algebraicallyEqual('nsqrt(2, x)', 'sqrt(x)')).toBe(true)
    })
  })

  describe('formule physique complète', () => {
    it('E = 1/2 m v^2 — ordre des facteurs et division/puissance mélangés', () => {
      expect(algebraicallyEqual('E = 1/2 * m * v^2', 'E = v^2 * m / 2')).toBe(true)
    })

    it('U = R*I ≡ U = I*R (loi d’Ohm, facteurs commutés)', () => {
      expect(algebraicallyEqual('U = R*I', 'U = I*R')).toBe(true)
    })
  })

  describe('faux positifs à éviter', () => {
    it('a+b n’est pas équivalent à a-b', () => {
      expect(algebraicallyEqual('a+b', 'a-b')).toBe(false)
    })

    it('a/b n’est pas équivalent à b/a (non commutatif)', () => {
      expect(algebraicallyEqual('a/b', 'b/a')).toBe(false)
    })

    it('2 n’est pas équivalent à 3', () => {
      expect(algebraicallyEqual('2', '3')).toBe(false)
    })

    it('pas de distributivité : 2*(a+b) ≠ 2a+2b (limite de périmètre assumée)', () => {
      expect(algebraicallyEqual('2*(a+b)', '2a+2b')).toBe(false)
    })
  })

  describe('repli silencieux (pas un CAS — hors périmètre = false, jamais d’exception)', () => {
    it('prose (mots de 4+ lettres) — aucune correspondance, pas d’exception', () => {
      expect(() => algebraicallyEqual('le principe d’Archimède', 'une autre explication')).not.toThrow()
      expect(algebraicallyEqual('le principe d’Archimède', 'une autre explication')).toBe(false)
    })

    it('matrices — non parsées comme expressions arithmétiques, pas d’exception', () => {
      expect(() => algebraicallyEqual('\\begin{pmatrix}1 & 2\\end{pmatrix}', 'a')).not.toThrow()
      expect(algebraicallyEqual('\\begin{pmatrix}1 & 2\\end{pmatrix}', 'a')).toBe(false)
    })

    it('inéquations — hors périmètre, toujours false', () => {
      expect(algebraicallyEqual('a < b', 'b > a')).toBe(false)
    })

    it('entrée non-string — false sans exception', () => {
      expect(algebraicallyEqual(null, 'a')).toBe(false)
      expect(algebraicallyEqual('a', undefined)).toBe(false)
    })

    it('formule invalide (parenthèse non fermée) — false sans exception', () => {
      expect(() => algebraicallyEqual('(a+b', 'a+b')).not.toThrow()
      expect(algebraicallyEqual('(a+b', 'a+b')).toBe(false)
    })
  })
})
