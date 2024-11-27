const db = require("./models/index");
const app = require("./app");

db.instance.sync({ force: false }).then(async () => {
  console.log("Database connected and synchronized");
  app
    .listen(process.env.API_PORT, () => {
      console.log("Server is running on port", process.env.API_PORT);
    })
    .catch((error) => {
      console.error("Failed to connect to the database:", error);
    });
});
