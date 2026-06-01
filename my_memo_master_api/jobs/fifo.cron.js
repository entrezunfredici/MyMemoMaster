// jobs/fifo.cron.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const { LeitnerCard, instance: sequelize } = require('../models');
const logger = require('../helpers/logger');

let isRunning = false;

function startFifoCron() {
    cron.schedule('*/10 * * * *', async () => {
        if (isRunning) return;
        isRunning = true;
        const t0 = Date.now();

        const tx = await sequelize.transaction();
        try {
            const now = new Date();

            const [affected] = await LeitnerCard.update(
                { fifo: true },
                {
                    where: {
                        fifo: false,
                        dateTimeFifo: { [Op.lte]: now },
                    },
                    transaction: tx,
                }
            );

            await tx.commit();

            if (affected > 0) {
                logger.info(`[fifo-cron] ${affected} carte(s) activée(s) (<= ${now.toISOString()}) en ${Date.now() - t0}ms`);
            }
        } catch (err) {
            await tx.rollback();
            logger.error('[fifo-cron] Erreur:', err);
        } finally {
            isRunning = false;
        }
    }, {
        timezone: 'UTC',
    });

    logger.info('[fifo-cron] Démarré (*/1 min)');
}

module.exports = { startFifoCron };
