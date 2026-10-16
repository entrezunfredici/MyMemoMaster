const {
  getKeyPrefix,
  buildUploadKey,
  buildMindmapKey,
  isUploadKey,
  isMindmapKey,
  isUserUploadKey
} = require('../../helpers/storageKeys')

describe('storageKeys', () => {
  const ORIGINAL = process.env.S3_KEY_PREFIX

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.S3_KEY_PREFIX
    else process.env.S3_KEY_PREFIX = ORIGINAL
  })

  describe('getKeyPrefix', () => {
    it('getKeyPrefix - variable absente - retourne une chaîne vide', () => {
      delete process.env.S3_KEY_PREFIX
      expect(getKeyPrefix()).toBe('')
    })

    it('getKeyPrefix - valeur "prod" ou "/prod//" - normalise en "prod/"', () => {
      process.env.S3_KEY_PREFIX = 'prod'
      expect(getKeyPrefix()).toBe('prod/')
      process.env.S3_KEY_PREFIX = '/prod//'
      expect(getKeyPrefix()).toBe('prod/')
    })

    it('getKeyPrefix - valeur invalide (.., espaces, caractères spéciaux) - lève une erreur', () => {
      for (const bad of ['../x', 'a/../b', 'pro d', 'prod?x', 'a//b']) {
        process.env.S3_KEY_PREFIX = bad
        expect(() => getKeyPrefix()).toThrow(/S3_KEY_PREFIX invalide/)
      }
    })
  })

  describe('buildUploadKey / buildMindmapKey', () => {
    it('buildUploadKey - sans préfixe - garde le format historique', () => {
      delete process.env.S3_KEY_PREFIX
      expect(buildUploadKey(42, '1-ab.png')).toBe('uploads/42/1-ab.png')
    })

    it('buildUploadKey - avec préfixe prod/ - préfixe la clé', () => {
      process.env.S3_KEY_PREFIX = 'prod/'
      expect(buildUploadKey(42, '1-ab.png')).toBe('prod/uploads/42/1-ab.png')
    })

    it('buildUploadKey - userId absent - utilise "anon"', () => {
      delete process.env.S3_KEY_PREFIX
      expect(buildUploadKey(undefined, 'x.png')).toBe('uploads/anon/x.png')
    })

    it('buildMindmapKey - avec préfixe preprod/ - préfixe la clé', () => {
      process.env.S3_KEY_PREFIX = 'preprod/'
      expect(buildMindmapKey('1-ab.png')).toBe('preprod/mindmaps/1-ab.png')
    })
  })

  describe('isMindmapKey', () => {
    beforeEach(() => {
      process.env.S3_KEY_PREFIX = 'prod/'
    })

    it('isMindmapKey - clé de l\'environnement courant - true', () => {
      expect(isMindmapKey('prod/mindmaps/1-ab.png')).toBe(true)
    })

    it('isMindmapKey - clé historique sans préfixe - true (objets existants)', () => {
      expect(isMindmapKey('mindmaps/1-ab.png')).toBe(true)
    })

    it('isMindmapKey - clé d\'un autre environnement - false', () => {
      expect(isMindmapKey('preprod/mindmaps/1-ab.png')).toBe(false)
    })

    it('isMindmapKey - sauvegarde de la base - false', () => {
      expect(isMindmapKey('backups/prod/mmm-20261012T030000Z.dump')).toBe(false)
    })

    it('isMindmapKey - fichier privé d\'un utilisateur - false', () => {
      expect(isMindmapKey('prod/uploads/42/1-ab.pdf')).toBe(false)
    })

    it('isMindmapKey - traversée "../" pour sortir de la zone - false', () => {
      expect(isMindmapKey('mindmaps/../backups/prod/mmm.dump')).toBe(false)
      expect(isMindmapKey('prod/mindmaps/../../backups/x')).toBe(false)
    })

    it('isMindmapKey - valeur vide, non-string ou segment vide - false', () => {
      for (const bad of ['', undefined, null, 42, 'mindmaps//x', 'mindmaps/./x', 'mindmaps/a\u0000b']) {
        expect(isMindmapKey(bad)).toBe(false)
      }
    })

    it('isMindmapKey - sans préfixe configuré - accepte seulement le format historique', () => {
      delete process.env.S3_KEY_PREFIX
      expect(isMindmapKey('mindmaps/1-ab.png')).toBe(true)
      expect(isMindmapKey('prod/mindmaps/1-ab.png')).toBe(false)
    })
  })

  describe('isUploadKey', () => {
    it('isUploadKey - clé courante et clé historique - true', () => {
      process.env.S3_KEY_PREFIX = 'prod/'
      expect(isUploadKey('prod/uploads/42/1-ab.png')).toBe(true)
      expect(isUploadKey('uploads/42/1-ab.png')).toBe(true)
    })

    it('isUploadKey - autre environnement, mindmap ou sauvegarde - false', () => {
      process.env.S3_KEY_PREFIX = 'prod/'
      expect(isUploadKey('preprod/uploads/42/1-ab.png')).toBe(false)
      expect(isUploadKey('prod/mindmaps/1-ab.png')).toBe(false)
      expect(isUploadKey('backups/prod/mmm.dump')).toBe(false)
    })
  })

  describe('isUserUploadKey', () => {
    beforeEach(() => {
      process.env.S3_KEY_PREFIX = 'prod/'
    })

    it('isUserUploadKey - fichier du même utilisateur - true', () => {
      expect(isUserUploadKey('prod/uploads/42/1-ab.png', 42)).toBe(true)
      expect(isUserUploadKey('uploads/42/1-ab.png', 42)).toBe(true)
    })

    it('isUserUploadKey - fichier d\'un autre utilisateur - false', () => {
      expect(isUserUploadKey('prod/uploads/43/1-ab.png', 42)).toBe(false)
    })

    it('isUserUploadKey - id partageant un préfixe numérique (4 vs 42) - false', () => {
      expect(isUserUploadKey('prod/uploads/42/1-ab.png', 4)).toBe(false)
    })

    it('isUserUploadKey - clé d\'un autre environnement - false', () => {
      expect(isUserUploadKey('preprod/uploads/42/1-ab.png', 42)).toBe(false)
    })

    it('isUserUploadKey - traversée vers le dossier d\'un autre utilisateur - false', () => {
      expect(isUserUploadKey('prod/uploads/42/../43/1-ab.png', 42)).toBe(false)
    })
  })
})
