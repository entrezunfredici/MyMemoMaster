const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const baseConfig = {
  username: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
  host: process.env.PG_HOST || 'localhost',
  port: parsePort(process.env.PG_PORT, 5432),
  dialect: 'postgres',
  logging: false
}

module.exports = {
  development: { ...baseConfig },
  test: {
    ...baseConfig,
    database: process.env.PG_TEST_DB || process.env.PG_DB
  },
  production: { ...baseConfig }
}
