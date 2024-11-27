const express = require("express");
const subject = require("../controllers/Subject.controller.js");

const router = express.Router();

router.get("/all", subject.findAll);
router.get("/:id", subject.findOne);
router.post("/add", subject.create);

module.exports = (app) => {
  app.use("/subjects", router);
};
