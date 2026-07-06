const { PassThrough } = require('stream')
const {
  extensionMatchesMime,
  bufferMatchesMime,
  s3SniffContentType
} = require('../../helpers/fileSignature')

// En-têtes binaires réels des formats autorisés
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const GIF89_HEADER = Buffer.from('GIF89a')
const WEBP_HEADER = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')])
const PDF_HEADER = Buffer.from('%PDF-1.7')
const ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
const CFB_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

describe('fileSignature helper', () => {
  describe('extensionMatchesMime', () => {
    it('extensionMatchesMime - extension et MIME cohérents - retourne true', () => {
      expect(extensionMatchesMime('.png', 'image/png')).toBe(true)
      expect(extensionMatchesMime('.jpg', 'image/jpeg')).toBe(true)
      expect(extensionMatchesMime('.jpeg', 'image/jpeg')).toBe(true)
      expect(extensionMatchesMime('.pdf', 'application/pdf')).toBe(true)
      expect(
        extensionMatchesMime(
          '.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe(true)
    })

    it('extensionMatchesMime - extension incohérente avec le MIME - retourne false', () => {
      expect(extensionMatchesMime('.exe', 'image/png')).toBe(false)
      expect(extensionMatchesMime('.png', 'image/jpeg')).toBe(false)
      expect(extensionMatchesMime('.pdf', 'image/png')).toBe(false)
    })

    it('extensionMatchesMime - extension vide ou MIME inconnu - retourne false', () => {
      expect(extensionMatchesMime('', 'image/png')).toBe(false)
      expect(extensionMatchesMime('.png', 'application/x-msdownload')).toBe(false)
    })
  })

  describe('bufferMatchesMime', () => {
    it('bufferMatchesMime - signature correspondant au MIME déclaré - retourne true', () => {
      expect(bufferMatchesMime(PNG_HEADER, 'image/png')).toBe(true)
      expect(bufferMatchesMime(JPEG_HEADER, 'image/jpeg')).toBe(true)
      expect(bufferMatchesMime(GIF89_HEADER, 'image/gif')).toBe(true)
      expect(bufferMatchesMime(WEBP_HEADER, 'image/webp')).toBe(true)
      expect(bufferMatchesMime(PDF_HEADER, 'application/pdf')).toBe(true)
      expect(
        bufferMatchesMime(
          ZIP_HEADER,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).toBe(true)
      expect(bufferMatchesMime(CFB_HEADER, 'application/msword')).toBe(true)
    })

    it('bufferMatchesMime - contenu ne correspondant pas au MIME déclaré - retourne false', () => {
      // Un exécutable (MZ) déguisé en PNG
      expect(bufferMatchesMime(Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), 'image/png')).toBe(false)
      // Un PNG déguisé en PDF
      expect(bufferMatchesMime(PNG_HEADER, 'application/pdf')).toBe(false)
    })

    it('bufferMatchesMime - buffer trop court pour la signature - retourne false', () => {
      expect(bufferMatchesMime(Buffer.from([0x89, 0x50]), 'image/png')).toBe(false)
      expect(bufferMatchesMime(Buffer.alloc(0), 'image/jpeg')).toBe(false)
    })

    it('bufferMatchesMime - entrée non-Buffer ou MIME inconnu - retourne false', () => {
      expect(bufferMatchesMime('not-a-buffer', 'image/png')).toBe(false)
      expect(bufferMatchesMime(PNG_HEADER, 'application/x-msdownload')).toBe(false)
    })
  })

  describe('s3SniffContentType', () => {
    const makeFile = (mimetype) => ({ stream: new PassThrough(), mimetype })

    it('s3SniffContentType - contenu conforme au MIME - relaie le flux intact', (done) => {
      const file = makeFile('image/png')
      const tail = Buffer.from('reste-du-fichier')

      s3SniffContentType(null, file, (err, mime, replacement) => {
        expect(err).toBeNull()
        expect(mime).toBe('image/png')

        const chunks = []
        replacement.on('data', (c) => chunks.push(c))
        replacement.on('end', () => {
          const full = Buffer.concat(chunks)
          expect(full.equals(Buffer.concat([PNG_HEADER, tail]))).toBe(true)
          done()
        })
      })

      file.stream.write(PNG_HEADER)
      file.stream.end(tail)
    })

    it('s3SniffContentType - signature invalide pour le MIME déclaré - rejette avec erreur 400', (done) => {
      const file = makeFile('image/png')

      s3SniffContentType(null, file, (err) => {
        expect(err).toBeInstanceOf(Error)
        expect(err.isFileFilterError).toBe(true)
        expect(err.code).toBe('INVALID_FILE_SIGNATURE')
        done()
      })

      file.stream.end(Buffer.from('MZ\x90\x00 pas une image'))
    })

    it('s3SniffContentType - flux vide - rejette avec erreur', (done) => {
      const file = makeFile('image/png')

      s3SniffContentType(null, file, (err) => {
        expect(err).toBeInstanceOf(Error)
        expect(err.isFileFilterError).toBe(true)
        done()
      })

      file.stream.end()
    })
  })
})
