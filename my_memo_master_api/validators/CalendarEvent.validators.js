const { body } = require("express-validator");

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_TYPES = ["cours", "examen", "autre"];
const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly"];
const VALID_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

exports.create = [
  body("name").trim().notEmpty().withMessage("Le nom est requis.").isLength({ min: 2, max: 150 }),
  body("description").optional({ nullable: true }).trim(),
  body("type").notEmpty().withMessage("Le type est requis.").isIn(VALID_TYPES).withMessage(`Le type doit être : ${VALID_TYPES.join(", ")}.`),
  body("classGroupId").notEmpty().withMessage("Le groupe classe est requis.").isInt({ min: 1 }).withMessage("classGroupId doit être un entier positif."),
  body("recurrenceMode").notEmpty().withMessage("Le mode de récurrence est requis.").isIn(["manual", "auto"]).withMessage("recurrenceMode doit être 'manual' ou 'auto'."),
  body("recurrenceRule")
    .if(body("recurrenceMode").equals("auto"))
    .notEmpty().withMessage("La règle de récurrence est requise en mode auto.")
    .isObject().withMessage("recurrenceRule doit être un objet.")
    .custom((rule) => {
      if (!VALID_FREQUENCIES.includes(rule.frequency)) {
        throw new Error(`frequency doit être : ${VALID_FREQUENCIES.join(", ")}.`);
      }
      if (!rule.startDate || !rule.endDate) {
        throw new Error("recurrenceRule doit contenir startDate et endDate.");
      }
      if (rule.frequency !== "monthly" && (!Array.isArray(rule.days) || rule.days.length === 0)) {
        throw new Error("recurrenceRule.days est requis pour les fréquences weekly et biweekly.");
      }
      if (Array.isArray(rule.days)) {
        const invalid = rule.days.filter((d) => !VALID_DAYS.includes(d.toLowerCase()));
        if (invalid.length > 0) throw new Error(`Jours invalides : ${invalid.join(", ")}.`);
      }
      if (!rule.startTime || !rule.endTime) {
        throw new Error("recurrenceRule doit contenir startTime et endTime.");
      }
      if (rule.startDate >= rule.endDate) {
        throw new Error("startDate doit être antérieure à endDate dans recurrenceRule.");
      }
      return true;
    }),
  body("occurrences")
    .if(body("recurrenceMode").equals("manual"))
    .optional()
    .isArray().withMessage("occurrences doit être un tableau."),
  body("occurrences.*.date").optional().isDate({ format: "YYYY-MM-DD" }).withMessage("Chaque occurrence doit avoir une date valide."),
  body("occurrences.*.startTime").optional().matches(timeRegex).withMessage("startTime invalide dans les occurrences."),
  body("occurrences.*.endTime").optional().matches(timeRegex).withMessage("endTime invalide dans les occurrences."),
];

exports.update = [
  body("name").optional().trim().isLength({ min: 2, max: 150 }),
  body("description").optional({ nullable: true }).trim(),
  body("type").optional().isIn(VALID_TYPES).withMessage(`Le type doit être : ${VALID_TYPES.join(", ")}.`),
];

exports.addOccurrence = [
  body("date").notEmpty().withMessage("La date est requise.").isDate({ format: "YYYY-MM-DD" }),
  body("startTime").notEmpty().withMessage("L'heure de début est requise.").matches(timeRegex).withMessage("Format HH:MM requis."),
  body("endTime")
    .notEmpty().withMessage("L'heure de fin est requise.")
    .matches(timeRegex).withMessage("Format HH:MM requis.")
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime <= req.body.startTime) {
        throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
      }
      return true;
    }),
];
