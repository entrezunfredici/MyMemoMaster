import { describe, it, expect } from 'vitest'
import { missingVariables, computeAllFormulas } from '@/helpers/mindmap/mindmapCalc'
import { unitHomogeneityStatus, checkUnitHomogeneity } from '@/components/interpreter/units'

const node = (id, o = {}) => ({ id, label: id, type: 'text', content: '', style: {}, layout: { x: 0, y: 0 }, ...o })

// Carte : une formule reliée à des grandeurs ({ symbol, value, unit, label? }).
const mapOf = (content, quantities = []) => {
  const nodes = { f: node('f', { type: 'formula', content }) }
  const links = []
  quantities.forEach((q, i) => {
    nodes[`q${i}`] = node(`q${i}`, { type: 'quantity', label: q.label ?? q.symbol, quantity: { symbol: q.symbol, value: q.value ?? null, unit: q.unit ?? '' } })
    links.push({ id: `l${i}`, from: 'f', to: `q${i}` })
  })
  return { nodes, links }
}
const missing = (content) => missingVariables(mapOf(content), 'f')
const result = (content, quantities) => computeAllFormulas(mapOf(content, quantities)).f

describe('variables manquantes — notation LaTeX', () => {
  it('une dérivée de vecteur ne propose que OP et t (d est un opérateur)', () => {
    expect(missing(String.raw`\vec{v}\left(t\right)=\frac{d\vec{OP}}{\differentialD t}`)).toEqual(['OP', 't'])
  })

  it('dérivées en d droit ou en ∂ : pas de variable « d »', () => {
    expect(missing(String.raw`v=\frac{\mathrm{d}x}{\mathrm{d}t}`)).toEqual(['x', 't'])
    expect(missing(String.raw`g=\frac{\partial f}{\partial t}`)).toEqual(['f', 't'])
  })

  it('une intégrale \\int f \\mathrm{d}x : le d droit n\'est pas une variable', () => {
    const names = missing(String.raw`W=\int f \mathrm{d}x`)
    expect(names).toEqual(expect.arrayContaining(['f', 'x']))
    expect(names).not.toContain('d')
  })

  it('le symbole du résultat \\vec{v}(t) est « v(t) » et la grandeur « v » le reçoit', () => {
    const r = result(String.raw`\vec{v}\left(t\right)=\frac{d\vec{OP}}{\differentialD t}`, [
      { symbol: 'OP', value: 10, unit: 'm' }, { symbol: 't', value: 2, unit: 's' },
    ])
    expect(r.symbol).toBe('v(t)')
    expect(r.value).toBe(5)
  })

  it('un système (cases) : variables des membres de droite, ni « cases », « end » ni « prime »', () => {
    expect(missing(String.raw`\begin{cases}x^{\prime}=x-vt\\t^{\prime}=t\end{cases}`)).toEqual(['x', 'v', 't'])
  })

  it('un système aligned avec & et des primes', () => {
    expect(missing(String.raw`\begin{aligned}x'&=x-vt\\t'&=t\end{aligned}`)).toEqual(['x', 'v', 't'])
  })

  it('une prime fait partie du symbole : x prime est une autre grandeur que x', () => {
    expect(missing(String.raw`E=m x^{\prime}`)).toEqual(['m', "x'"])
  })

  it('un système n\'est pas calculé, avec un message clair', () => {
    const r = result(String.raw`\begin{cases}a=b\\c=d\end{cases}`, [{ symbol: 'b', value: 1 }])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Système d’équations/)
  })

  it('un « d » qui n\'est pas une différentielle reste une variable', () => {
    expect(missing(String.raw`v=\frac{d}{t}`)).toEqual(['d', 't'])
  })

  it('une formule simple : une variable par lettre inconnue', () => {
    expect(missing('p = m v')).toEqual(['m', 'v'])
  })

  it('un vecteur \\vec{v} est la variable « v », pas « vec » + « v »', () => {
    expect(missing(String.raw`\vec{p} = m \vec{v}`)).toEqual(['m', 'v'])
  })

  it('un vecteur à plusieurs lettres \\overrightarrow{OP} est UNE variable « OP »', () => {
    expect(missing(String.raw`d = \overrightarrow{OP}`)).toEqual(['OP'])
  })

  it.each(['hat', 'bar', 'overline', 'mathbf', 'boldsymbol', 'dot', 'ddot', 'tilde'])('la décoration \\%s ne crée pas de variable « %s »', (decoration) => {
    const vars = missing(`a = \\${decoration}{b} c`)
    expect(vars).toEqual(['b', 'c'])
  })

  it('un indice sur un vecteur reste attaché : \\vec{v}_0 devient « v0 »', () => {
    expect(missing(String.raw`x = \vec{v}_0 t`)).toEqual(['v0', 't'])
  })

  it('une annotation \\text{…} n’ajoute aucune variable', () => {
    expect(missing(String.raw`F = m a \text{ en N}`)).toEqual(['m', 'a'])
  })

  it('une unité entre crochets (« m [kg] ») n’ajoute aucune variable', () => {
    expect(missing('E = m [kg]')).toEqual(['m'])
    expect(missing('v = d [m] / t [s]')).toEqual(['d', 't'])
    expect(missing('F = m [kg·m/s^2]')).toEqual(['m'])
  })

  it('des crochets qui ne sont pas une unité restent un regroupement', () => {
    expect(missing('y = [a + b] c')).toEqual(['a', 'b', 'c'])
  })

  it('des crochets vides restent des opérateurs et ne cassent pas l’analyse des autres variables', () => {
    expect(() => missing('y = a []')).not.toThrow()
  })
})

describe('calcul — notation LaTeX et symboles', () => {
  it('p = m v avec m et v reliées : calculé', () => {
    const r = result('p = m v', [{ symbol: 'm', value: 2, unit: 'kg' }, { symbol: 'v', value: 3, unit: 'm/s' }])
    expect(r).toMatchObject({ ok: true, value: 6, unit: 'kg·m/s' })
  })

  it('un vecteur relié par son symbole « \\vec{v} » est reconnu comme « v »', () => {
    const r = result(String.raw`p = m \vec{v}`, [{ symbol: 'm', value: 2, unit: 'kg' }, { symbol: String.raw`\vec{v}`, value: 3, unit: 'm/s' }])
    expect(r).toMatchObject({ ok: true, value: 6 })
  })

  it('une grandeur sans symbole saisi prend son titre comme symbole quand il ressemble à un symbole', () => {
    const r = result('p = m v', [{ label: 'm', symbol: '', value: 2, unit: 'kg' }, { symbol: 'v', value: 3, unit: 'm/s' }])
    expect(r).toMatchObject({ ok: true, value: 6 })
    expect(missingVariables(mapOf('p = m v', [{ label: 'm', symbol: '', value: 2, unit: 'kg' }]), 'f')).toEqual(['v'])
  })

  it('un titre qui n’est pas un symbole (« Masse de la voiture ») n’est pas pris pour un symbole', () => {
    const r = result('p = m v', [{ label: 'Masse de la voiture', symbol: '', value: 2, unit: 'kg' }, { symbol: 'v', value: 3, unit: 'm/s' }])
    expect(r.ok).toBe(false)
    expect(r.error).toContain('« m » non reliée')
  })

  it('le symbole saisi l’emporte sur le titre', () => {
    const r = result('p = M v', [{ label: 'm', symbol: 'M', value: 2, unit: 'kg' }, { symbol: 'v', value: 3, unit: 'm/s' }])
    expect(r).toMatchObject({ ok: true, value: 6 })
  })

  it('une unité entre crochets est ignorée au calcul', () => {
    const r = result('p = m [kg] v', [{ symbol: 'm', value: 2, unit: 'kg' }, { symbol: 'v', value: 3, unit: 'm/s' }])
    expect(r).toMatchObject({ ok: true, value: 6 })
  })
})

describe('homogénéité — verdict affichable', () => {
  it('formule vide ou blanche : rien à dire', () => {
    expect(unitHomogeneityStatus('').status).toBe('empty')
    expect(unitHomogeneityStatus('  \n ').status).toBe('empty')
    expect(unitHomogeneityStatus(undefined).status).toBe('empty')
  })

  it('l’exemple de l’application (P[Pa] = F[N] / S[m^2]) est jugé homogène', () => {
    expect(unitHomogeneityStatus('P[Pa] = F[N] / S[m^2]')).toEqual({ status: 'ok', message: 'Formule homogène en unités.' })
  })

  it('une égalité fausse est une erreur détaillée', () => {
    const v = unitHomogeneityStatus('P[Pa] = F[N] * S[m^2]')
    expect(v.status).toBe('error')
    expect(v.message).toContain('Erreur d’homogénéité')
  })

  it('une addition de grandeurs différentes est une erreur', () => {
    expect(unitHomogeneityStatus('x[m] = a[m] + t[s]').status).toBe('error')
  })

  it('sans unité déclarée : non vérifiable (et non « homogène »)', () => {
    const v = unitHomogeneityStatus('E = m c^2')
    expect(v.status).toBe('unknown')
    expect(v.message).toContain('aucune unité déclarée')
  })

  it('un seul segment déterminé ne prouve rien : non vérifiable', () => {
    expect(unitHomogeneityStatus('P[Pa] = F / S').status).toBe('unknown')
  })

  it('plusieurs lignes : une erreur l’emporte sur les lignes homogènes', () => {
    expect(unitHomogeneityStatus('P[Pa] = F[N] / S[m^2]\nx[m] = a[m] + t[s]').status).toBe('error')
  })

  it('checkUnitHomogeneity garde son contrat : null si homogène ou injugeable, message sinon', () => {
    expect(checkUnitHomogeneity('P[Pa] = F[N] / S[m^2]')).toBeNull()
    expect(checkUnitHomogeneity('E = m c^2')).toBeNull()
    expect(checkUnitHomogeneity('P[Pa] = F[N] * S[m^2]')).toContain('Erreur d’homogénéité')
  })
})
