const logger = require('./helpers/logger');
const db = require("./models/index");
const bcrypt = require("bcryptjs");

// ? Script to seed the database with sample data for test purposes

const listTables = async () => {
  // * Function to list all tables in the database
  try {
    const tables = await db.instance.query(
      "SELECT tablename FROM catalog.tables WHERE schemaname != 'catalog' AND schemaname != 'information_schema';"
    );
    logger.info(tables[0].map((table) => table.tablename));
  } catch (error) {
    logger.error("Error listing tables");
    logger.error(error?.message || error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await db.instance.authenticate();
    logger.info("Database connected successfully");

    // Force sync: drops tables and recreates them
    await db.instance.sync({ force: true });
    logger.info("Database synchronized successfully");

    await db.instance.query("PRAGMA foreign_keys = OFF");

    // Désactiver les déclencheurs de clés étrangères pour les insertions
    // await db.instance.query('ALTER TABLE "User" DISABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "Role" DISABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "LeitnerSystem" DISABLE TRIGGER ALL');

    const users = require("./seeds/User.seed.json");
    users.forEach((user) => {
      user.password = bcrypt.hashSync(user.password, 10);
    });
    await db.User.bulkCreate(users);
    logger.info("Users table seeded successfully");

    await db.Role.bulkCreate(require("./seeds/Role.seed.json"));
    logger.info("Roles table seeded successfully");

    await db.Subject.bulkCreate(require("./seeds/Subject.seed.json"));
    logger.info("Subjects table seeded successfully");

    await db.Subject.bulkCreate(require("./seeds/Units.seed.json"));
    logger.info("Units table seeded successfully");
    
    await db.Question.bulkCreate(require("./seeds/Question.seed.json"));
    logger.info("Question table seeded successfully");

    await db.Response.bulkCreate(require("./seeds/Response.seed.json"));
    logger.info("Response table seeded successfully");

    await db.Diagramme.bulkCreate(require("./seeds/Diagramme.seed.json"));
    logger.info("diagrammes table seeded successfully");

    await db.LeitnerSystem.bulkCreate(
      require("./seeds/LeitnerSystem.seed.json")
    );
    logger.info("LeitnerSystems table seeded successfully");

    await db.LeitnerBox.bulkCreate(require("./seeds/LeitnerBox.seed.json"));
    logger.info("LeitnerBoxes table seeded successfully");

    await db.LeitnerCard.bulkCreate(require("./seeds/LeitnerCard.seed.json"));
    logger.info("LeitnerCards table seeded successfully");

    await db.Test.bulkCreate(require("./seeds/Test.seed.json"));
    logger.info("Test table seeded successfully");

    // Réactiver les déclencheurs de clés étrangères
    // await db.instance.query('ALTER TABLE "User" ENABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "Role" ENABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "LeitnerSystem" ENABLE TRIGGER ALL');

   // await db.instance.query("PRAGMA foreign_keys = ON");

    logger.info("Sample data inserted successfully");
  } catch (error) {
    logger.error("Error inserting sample data");
    logger.error(error?.message || error);
    throw error;
  }
};

const checkSeed = async () => {
  // * Function to verify that the sample data has been inserted
  try {
    const roles = await db.Role.findAll();
    logger.info(roles)
    if (roles.length === 0) {
      logger.warn("No data found in the database");
    } else {
      logger.info("Sample data verified");
    }
  } catch (error) {
    logger.error("Error verifying sample data");
    logger.error(error?.message || error);
    throw error;
  }
};

(async () => {
  try {
    // await listTables();
    await seedDatabase();
    await checkSeed();
    logger.info("Data seeding completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error running the script");
    logger.error(error?.message || error);
    process.exit(1);
  } finally {
    await db.instance.close();
  }
})();
