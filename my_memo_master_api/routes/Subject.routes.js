const express = require("express");
const {
  validateSubject,
  validateId,
} = require("../validators/subject.validator");
const subject = require("../controllers/subject.controller.js");

const router = express.Router();

router.get("/", subject.findAll);
router.get("/:id", validateId, subject.findOne);
router.post("/", validateSubject, subject.create);

module.exports = (app) => {
  app.use("/subject", router);
};
