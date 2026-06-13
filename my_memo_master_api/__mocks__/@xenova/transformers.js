module.exports = {
  pipeline: jest.fn(async () => jest.fn(async () => ({ data: new Float32Array([0, 0, 0]) })))
}
