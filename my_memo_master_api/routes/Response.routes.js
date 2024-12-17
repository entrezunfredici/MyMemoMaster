const express = require("express");
const ResponseController = require("../controllers/Response.controller");

const router = express.Router();

// Routes pour Responses
router.get("/", ResponseController.getAll);
router.get("/:id", ResponseController.getById);
router.post("/", ResponseController.create);
router.put("/:id", ResponseController.update);
router.delete("/:id", ResponseController.delete);

module.exports = router;
