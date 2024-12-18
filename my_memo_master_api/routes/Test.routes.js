const express = require("express");
const test = require("../controllers/Test.controller.js");

const router = express.Router();

router.get("/all", test.findAll);

router.get("/:id", test.findOne);

router.post("/add", test.create);

router.put("/:id", test.update);

router.delete("/:id", test.delete);

module.exports = (app) => {
    app.use("/tests", router);
};
