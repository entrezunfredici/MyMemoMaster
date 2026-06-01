const db = require("./models/index");
const app = require("./app");
const logger = require("./helpers/logger");

db.instance.sync().then(async () => {
    logger.info('Database connected and synchronized');
    app.listen(process.env.API_PORT, () => {
        logger.info(`Server is running on: http://localhost:${process.env.API_PORT}`);
    });
}).catch((e) => {
    logger.error(e);
});

