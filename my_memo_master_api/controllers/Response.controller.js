const ResponseService = require("../services/Response.service");

const ResponseController = {
  async getAll(req, res, next) {
    try {
      const responses = await ResponseService.getAll();
      res.status(200).json(responses);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const response = await ResponseService.getById(req.params.id);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const newResponse = await ResponseService.create(req.body);
      res.status(201).json(newResponse);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const updatedResponse = await ResponseService.update(
        req.params.id,
        req.body
      );
      res.status(200).json(updatedResponse);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await ResponseService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ResponseController;
