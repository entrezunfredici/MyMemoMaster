const db = require("./models/index");

// ? This script is meant to be run only once, to seed the database with sample data just for test purposes. It will drop all existing tables and recreate them, then insert the sample data.

const listTables = async () => {
  // * This function will list all tables in the database
  try {
    const tables = await db.instance.query(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    console.log(tables[0].map((table) => table.name));
  } catch (error) {
    console.error("Error listing tables");
    console.error(error);
    throw error;
  }
};

const seedDatabase = async () => {
  // * This function will drop all existing tables, recreate them, and insert sample data
  try {
    await db.instance.authenticate();
    console.log("Database connected successfully");

    await db.instance.sync({ force: true });
    console.log("Database synchronized successfully");

    await db.instance.query("PRAGMA foreign_keys = OFF");

    await db.Role.bulkCreate(require("./seeds/Role.seed.json"));
    console.log("Roles table seeded successfully");
    await db.Subject.bulkCreate(require("./seeds/Subject.seed.json"));
    console.log("Subjects table seeded successfully");

    await db.instance.query("PRAGMA foreign_keys = ON");

    console.log("Sample data inserted");
  } catch (error) {
    console.error("Error inserting sample data");
    console.error(error);
    throw error;
  }
};

const checkSeed = async () => {
  // * This function will verify that the sample data has been inserted. We assume that if ONE record is found, then all records have been inserted.
  try {
    const roles = await db.Role.findAll();
    if (roles.length === 0) {
      console.warn("No data found in the database");
    } else {
      console.log("Sample data verified");
    }
  } catch (error) {
    console.error("Error verifying sample data");
    console.error(error);
    throw error;
  }
};

(async () => {
  try {
    await listTables();
    await seedDatabase();
    await checkSeed();
    console.log("Data seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("Error running the script");
    console.error(error);
    process.exit(1);
  } finally {
    await db.instance.close();
  }
})();
