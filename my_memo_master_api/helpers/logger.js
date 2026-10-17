const { createLogger, format, transports } = require('winston')

const isProd = process.env.NODE_ENV === 'production'

const logger = createLogger({
  level: isProd ? 'warn' : 'http',
  format: isProd
    ? format.combine(format.timestamp(), format.json())
    : format.combine(
        format.colorize(),
        format.timestamp({ format: 'HH:mm:ss' }),
        // Injection de journaux (OWASP A09, alertes CodeQL js/log-injection) : un message qui contient une
        // donnée utilisateur ne doit pas pouvoir forger une fausse ligne de journal. En production le format
        // JSON échappe déjà les sauts de ligne ; ici (format texte) on les neutralise explicitement.
        format.printf(({ timestamp, level, message }) =>
          `${timestamp} [${level}] ${String(message).replace(/[\r\n]+/g, ' ⏎ ')}`)
      ),
  transports: [new transports.Console()]
})

module.exports = logger
