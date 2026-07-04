module.exports = {
  dialect: 'sqlite',
  dialectModule: require('better-sqlite3'),
  storage: process.env.DB_STORAGE || './db.sqlite',
  logging: false
}
