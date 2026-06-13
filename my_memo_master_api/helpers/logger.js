const { createLogger, format, transports } = require('winston')

const isProd = process.env.NODE_ENV === 'production'

const logger = createLogger({
  level: isProd ? 'warn' : 'info',
  format: isProd
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
      ),
  transports: [new transports.Console()]
})

module.exports = logger
