const { Tag, Diagramme, LeitnerSystem, Test } = require('../models/index')

const TAG_ATTRS = ['tagId', 'name', 'color']

class TagService {
  /**
   * Retourne tous les tags triés par nom.
   * @returns {Tag[]}
   */
  async findAll() {
    return await Tag.findAll({ attributes: TAG_ATTRS, order: [['name', 'ASC']] })
  }

  /**
   * Retourne un tag par son ID.
   * @param {number} tagId
   * @returns {Tag|null}
   */
  async findOne(tagId) {
    return await Tag.findByPk(tagId, { attributes: TAG_ATTRS })
  }

  /**
   * Crée un tag.
   * @param {{ name: string }} data
   * @returns {Tag}
   */
  async create(data) {
    return await Tag.create({ name: data.name, color: data.color || '#6366F1' })
  }

  /**
   * Met à jour le nom et/ou la couleur d'un tag.
   * @param {number} tagId
   * @param {{ name?: string, color?: string }} data
   * @returns {Tag|null}
   */
  async update(tagId, data) {
    const tag = await Tag.findByPk(tagId)
    if (!tag) return null
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.color !== undefined) updates.color = data.color
    await tag.update(updates)
    return tag
  }

  /**
   * Supprime un tag (cascade sur les tables de jonction).
   * @param {number} tagId
   * @returns {boolean}
   */
  async delete(tagId) {
    const tag = await Tag.findByPk(tagId)
    if (!tag) return false
    await tag.destroy()
    return true
  }

  /**
   * Remplace les tags associés à une carte mentale.
   * @param {number} mindMapId
   * @param {number[]} tagIds
   * @returns {Tag[]|null} null si la carte n'existe pas
   */
  async setTagsForMindMap(mindMapId, tagIds) {
    const mindMap = await Diagramme.findByPk(mindMapId)
    if (!mindMap) return null
    const tags = tagIds.length ? await Tag.findAll({ where: { tagId: tagIds } }) : []
    await mindMap.setTags(tags)
    return tags
  }

  /**
   * Remplace les tags associés à un système Leitner.
   * @param {number} systemId
   * @param {number[]} tagIds
   * @returns {Tag[]|null} null si le système n'existe pas
   */
  async setTagsForLeitnerSystem(systemId, tagIds) {
    const system = await LeitnerSystem.findByPk(systemId)
    if (!system) return null
    const tags = tagIds.length ? await Tag.findAll({ where: { tagId: tagIds } }) : []
    await system.setTags(tags)
    return tags
  }

  /**
   * Remplace les tags associés à un exercice.
   * @param {number} testId
   * @param {number[]} tagIds
   * @returns {Tag[]|null} null si l'exercice n'existe pas
   */
  async setTagsForTest(testId, tagIds) {
    const test = await Test.findByPk(testId)
    if (!test) return null
    const tags = tagIds.length ? await Tag.findAll({ where: { tagId: tagIds } }) : []
    await test.setTags(tags)
    return tags
  }
}

module.exports = new TagService()
