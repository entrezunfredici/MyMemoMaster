const db = require("./models/index");
const bcrypt = require("bcryptjs");

// ? Script to seed the database with sample data for test purposes

const listTables = async () => {
  // * Function to list all tables in the database
  try {
    const tables = await db.instance.query(
      "SELECT tablename FROM catalog.tables WHERE schemaname != 'catalog' AND schemaname != 'information_schema';"
    );
    console.log(tables[0].map((table) => table.tablename));
  } catch (error) {
    console.error("Error listing tables");
    console.error(error?.message || error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await db.instance.authenticate();
    console.log("Database connected successfully");

    // Force sync: drops tables and recreates them
    await db.instance.sync({ force: true });
    console.log("Database synchronized successfully");

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
    console.log("Users table seeded successfully");

    await db.Role.bulkCreate(require("./seeds/Role.seed.json"));
    console.log("Roles table seeded successfully");

    await db.Subject.bulkCreate(require("./seeds/Subject.seed.json"));
    console.log("Subjects table seeded successfully");

    await db.Subject.bulkCreate(require("./seeds/Units.seed.json"));
    console.log("Units table seeded successfully");
    
    await db.Question.bulkCreate(require("./seeds/Question.seed.json"));
    console.log("Question table seeded successfully");

    await db.Response.bulkCreate(require("./seeds/Response.seed.json"));
    console.log("Response table seeded successfully");

    await db.Diagramme.bulkCreate(require("./seeds/Diagramme.seed.json"));
    console.log("diagrammes table seeded successfully");

    await db.LeitnerSystem.bulkCreate(
      require("./seeds/LeitnerSystem.seed.json")
    );
    console.log("LeitnerSystems table seeded successfully");

    await db.LeitnerBox.bulkCreate(require("./seeds/LeitnerBox.seed.json"));
    console.log("LeitnerBoxes table seeded successfully");

    await db.LeitnerCard.bulkCreate(require("./seeds/LeitnerCard.seed.json"));
    console.log("LeitnerCards table seeded successfully");

    await db.Test.bulkCreate(require("./seeds/Test.seed.json"));
    console.log("Test table seeded successfully");

    // Réactiver les déclencheurs de clés étrangères
    // await db.instance.query('ALTER TABLE "User" ENABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "Role" ENABLE TRIGGER ALL');
    // await db.instance.query('ALTER TABLE "LeitnerSystem" ENABLE TRIGGER ALL');

   // await db.instance.query("PRAGMA foreign_keys = ON");

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data");
    console.error(error?.message || error);
    throw error;
  }
};

const checkSeed = async () => {
  // * Function to verify that the sample data has been inserted
  try {
    const roles = await db.Role.findAll();
    console.log(roles)
    if (roles.length === 0) {
      console.warn("No data found in the database");
    } else {
      console.log("Sample data verified");
    }
  } catch (error) {
    console.error("Error verifying sample data");
    console.error(error?.message || error);
    throw error;
  }
};

(async () => {
  try {
    // await listTables();
    await seedDatabase();
    await checkSeed();
    console.log("Data seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("Error running the script");
    console.error(error?.message || error);
    process.exit(1);
  } finally {
    await db.instance.close();
  }
})();
