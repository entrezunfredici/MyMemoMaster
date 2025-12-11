const express = require("express");
const event = require("../controllers/Event.controller");

const router = express.Router();

router.post("/add", event.create)