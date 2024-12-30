module.exports = {
  dialect: "postgres",
  host: process.env.PG_HOST,       // Exemple : 'localhost'
  username: 'postgres',   // Exemple : 'postgres'
  password: 'admin',   // Ton mot de passe PostgreSQL
  database: 'mymemomasterdb',     // Nom de la base de données
  port: process.env.PG_PORT,       // Port PostgreSQL, par défaut 5432
  logging: console.log,            // Affiche un message quand la connexion est établie
};
