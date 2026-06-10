const { body } = require("express-validator");

exports.create = [
  body("name").trim().notEmpty().withMessage("Le nom du groupe est requis.").isLength({ min: 2, max: 100 }).withMessage("Le nom doit contenir entre 2 et 100 caractères."),
  body("description").optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("La description ne peut pas dépasser 500 caractères."),
];

exports.update = [
  body("name").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Le nom doit contenir entre 2 et 100 caractères."),
  body("description").optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage("La description ne peut pas dépasser 500 caractères."),
];

exports.addMember = [
  body("userId").notEmpty().withMessage("L'identifiant de l'utilisateur est requis.").isInt({ min: 1 }).withMessage("userId doit être un entier positif."),
  body("role").notEmpty().withMessage("Le rôle est requis.").isIn(["teacher", "student"]).withMessage("Le rôle doit être 'teacher' ou 'student'."),
];
