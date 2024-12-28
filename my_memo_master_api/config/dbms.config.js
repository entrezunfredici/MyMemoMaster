const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.PG_USER,       // Déclaré dans votre fichier .env
  host: process.env.PG_HOST,       // Par exemple : "localhost"
  database: process.env.PG_DB,     // Nom de la base de données
  password: process.env.PG_PASS,   // Mot de passe PostgreSQL
  port: process.env.PG_PORT,
});

module.exports = pool;