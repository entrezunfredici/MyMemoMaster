import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }))
vi.mock('@/helpers/api', () => ({ api: { post: mockPost } }))
vi.mock('@/config', () => ({ VITE_API_URL: 'http://api.test/api/v1/' }))

import { uploadMindmapImage, resolveImageUrl, MAX_IMAGE_SIZE } from '@/helpers/mindmap/mindmapImage'

const file = (size = 10) => new File([new Uint8Array(size)], 'a.png', { type: 'image/png' })

describe('mindmapImage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolveImageUrl — chemin relatif résolu sur le serveur, url absolue conservée, vide sinon', () => {
    expect(resolveImageUrl({ path: '/uploads/a.png' })).toBe('http://api.test/uploads/a.png')
    expect(resolveImageUrl({ url: 'https://cdn.test/a.png' })).toBe('https://cdn.test/a.png')
    expect(resolveImageUrl({})).toBe('')
    expect(resolveImageUrl(null)).toBe('')
  })

  it('envoie le fichier en multipart et retourne l’URL', async () => {
    mockPost.mockResolvedValue({ data: { path: '/uploads/a.png' } })
    await expect(uploadMindmapImage(file())).resolves.toBe('http://api.test/uploads/a.png')
    const [route, body, options] = mockPost.mock.calls[0]
    expect(route).toBe('diagrammes/upload-image')
    expect(body.get('image').name).toBe('a.png')
    expect(options.headers['Content-Type']).toBe('multipart/form-data')
  })

  it('refuse une image trop lourde sans appeler l’API', async () => {
    await expect(uploadMindmapImage(file(MAX_IMAGE_SIZE + 1))).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' })
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('erreur réseau ou réponse vide : UPLOAD_FAILED ; réponse sans URL : INVALID_IMAGE_URL', async () => {
    mockPost.mockRejectedValueOnce(new Error('réseau'))
    await expect(uploadMindmapImage(file())).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })
    mockPost.mockResolvedValueOnce({})
    await expect(uploadMindmapImage(file())).rejects.toMatchObject({ code: 'UPLOAD_FAILED' })
    mockPost.mockResolvedValueOnce({ data: {} })
    await expect(uploadMindmapImage(file())).rejects.toMatchObject({ code: 'INVALID_IMAGE_URL' })
  })
})
