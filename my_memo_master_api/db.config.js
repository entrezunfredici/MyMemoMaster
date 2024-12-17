module.exports = {
    dialect: "sqlite",
    storage: "./my-db.sqlite",
    logging: console.log('\x1b[32m%s\x1b[0m', 'Database connection established!')
}