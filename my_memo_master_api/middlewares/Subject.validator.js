const { body, param } = require("express-validator");

exports.validateSubject = [
  body("name")
    .notEmpty()
    .withMessage("Le champ 'name' est requis.")
    .isString()
    .withMessage("Le champ 'name' doit être une chaîne de caractères."),
];

exports.validateId = [
  param("id").isInt().withMessage("L'identifiant doit être un entier."),
];
