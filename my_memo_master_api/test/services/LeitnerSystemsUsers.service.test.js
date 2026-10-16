const { LeitnerSystemsUsers } = require('../../models')
const LeitnerSystemsUsersService = require('../../services/LeitnerSystemsUsers.service')
const rightsCache = require('../../helpers/leitnerRightsCache')

jest.mock('../../models', () => ({
  LeitnerSystemsUsers: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}))

jest.mock('../../helpers/leitnerRightsCache', () => ({
  invalidateRights: jest.fn().mockResolvedValue(undefined)
}))

describe('LeitnerSystemsUsers Service', () => {
  const mockData = {
    idUser: 1,
    idSystem: 1,
    writeRight: true,
    shareRight: false,
    shareWithWriteRightRight: false,
    shareWithAllRights: true
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Test CREATE
  it('should create a new LeitnerSystemsUsers entry', async () => {
    LeitnerSystemsUsers.create.mockResolvedValue(mockData)

    const result = await LeitnerSystemsUsersService.create(mockData)

    expect(LeitnerSystemsUsers.create).toHaveBeenCalledWith(mockData)
    expect(result).toEqual(mockData)
  })

  // R5 (B4_RENDU.md §5) : le cache de droits Leitner doit être invalidé à chaque écriture de partage
  it('create - invalide le cache de droits Leitner (R5)', async () => {
    LeitnerSystemsUsers.create.mockResolvedValue(mockData)

    await LeitnerSystemsUsersService.create(mockData)

    expect(rightsCache.invalidateRights).toHaveBeenCalledWith(mockData.idUser, mockData.idSystem)
  })

  // Test FIND ALL
  it('should retrieve all LeitnerSystemsUsers entries', async () => {
    const mockEntries = [mockData, { ...mockData, idSystem: 2 }]
    LeitnerSystemsUsers.findAll.mockResolvedValue(mockEntries)

    const result = await LeitnerSystemsUsersService.findAll()

    expect(LeitnerSystemsUsers.findAll).toHaveBeenCalled()
    expect(result).toEqual(mockEntries)
  })

  // Test FIND ONE
  it('should retrieve a specific LeitnerSystemsUsers entry', async () => {
    LeitnerSystemsUsers.findOne.mockResolvedValue(mockData)

    const result = await LeitnerSystemsUsersService.findOne(1, 1)

    expect(LeitnerSystemsUsers.findOne).toHaveBeenCalledWith({
      where: { idUser: 1, idSystem: 1 }
    })
    expect(result).toEqual(mockData)
  })

  // Test UPDATE
  it('should update a LeitnerSystemsUsers entry', async () => {
    LeitnerSystemsUsers.update.mockResolvedValue([1])

    const updatedData = { writeRight: false }
    const result = await LeitnerSystemsUsersService.update(1, 1, updatedData)

    expect(LeitnerSystemsUsers.update).toHaveBeenCalledWith(updatedData, {
      where: { idUser: 1, idSystem: 1 }
    })
    expect(result).toEqual([1])
  })

  it('update - invalide le cache de droits Leitner (R5)', async () => {
    LeitnerSystemsUsers.update.mockResolvedValue([1])

    await LeitnerSystemsUsersService.update(1, 1, { writeRight: false })

    expect(rightsCache.invalidateRights).toHaveBeenCalledWith(1, 1)
  })

  // Test DELETE
  it('should delete a LeitnerSystemsUsers entry', async () => {
    LeitnerSystemsUsers.destroy.mockResolvedValue(1)

    const result = await LeitnerSystemsUsersService.delete(1, 1)

    expect(LeitnerSystemsUsers.destroy).toHaveBeenCalledWith({
      where: { idUser: 1, idSystem: 1 }
    })
    expect(result).toBe(1)
  })

  it('delete - invalide le cache de droits Leitner (R5)', async () => {
    LeitnerSystemsUsers.destroy.mockResolvedValue(1)

    await LeitnerSystemsUsersService.delete(1, 1)

    expect(rightsCache.invalidateRights).toHaveBeenCalledWith(1, 1)
  })
})
