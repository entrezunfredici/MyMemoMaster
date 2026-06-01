const logger = require('./helpers/logger');
const db = require("./models/index");
const bcrypt = require("bcryptjs");

// ? This script is meant to be run only once, to seed the database with sample data just for test purposes. It will drop all existing tables and recreate them, then insert the sample data.

const listTables = async () => {
  // * This function will list all tables in the database
  try {
    const tables = await db.instance.query(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    logger.info(tables[0].map((table) => table.name));
  } catch (error) {
    logger.error("Error listing tables");
    logger.error(error);
    throw error;
  }
};

const seedDatabase = async () => {
  // * This function will drop all existing tables, recreate them, and insert sample data
  try {
    await db.instance.authenticate();
    logger.info("Database connected successfully");

    await db.instance.sync({ force: true });
    logger.info("Database synchronized successfully");

    await db.instance.query("PRAGMA foreign_keys = OFF");

    const users = require("./seeds/User.seed.json");
    users.forEach((user) => {
      user.password = bcrypt.hashSync(user.password, 10);
    });
    await db.User.bulkCreate(users);
    logger.info("Users table seeded successfully");

    const roles = require("./seeds/Role.seed.json");
    await db.Role.bulkCreate(roles);
    logger.info("Roles table seeded successfully");

    const subjects = require("./seeds/Subject.seed.json");
    await db.Subject.bulkCreate(subjects);
    logger.info("Subjects table seeded successfully");

    await db.LeitnerSystem.bulkCreate(
      require("./seeds/LeitnerSystem.seed.json")
    );
    logger.info("LeitnerSystems table seeded successfully");
    await db.LeitnerBox.bulkCreate(require("./seeds/LeitnerBox.seed.json"));
    logger.info("LeitnerBoxes table seeded successfully");
    await db.LeitnerCard.bulkCreate(require("./seeds/LeitnerCard.seed.json"));
    logger.info("LeitnerCards table seeded successfully");
    await db.instance.query("PRAGMA foreign_keys = ON");

    logger.info("Sample data inserted");
  } catch (error) {
    logger.error("Error inserting sample data");
    logger.error(error);
    throw error;
  }
};

const checkSeed = async () => {
  // * This function will verify that the sample data has been inserted. We assume that if ONE record is found, then all records have been inserted.
  try {
    const roles = await db.Role.findAll();
    if (roles.length === 0) {
      logger.warn("No data found in the database");
    } else {
      logger.info("Sample data verified");
    }
  } catch (error) {
    logger.error("Error verifying sample data");
    logger.error(error);
    throw error;
  }
};

(async () => {
  try {
    await listTables();
    await seedDatabase();
    await checkSeed();
    logger.info("Data seeding completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error running the script");
    logger.error(error);
    process.exit(1);
  } finally {
    await db.instance.close();
  }
})();
