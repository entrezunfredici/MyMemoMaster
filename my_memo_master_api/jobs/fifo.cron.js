// jobs/fifo.cron.js
const cron = require('node-cron');
const { Op } = require('sequelize');
const { LeitnerCard, sequelize } = require('../models');

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
                console.log(`[fifo-cron] ${affected} carte(s) activée(s) (<= ${now.toISOString()}) en ${Date.now() - t0}ms`);
            }
        } catch (err) {
            await tx.rollback();
            console.error('[fifo-cron] Erreur:', err);
        } finally {
            isRunning = false;
        }
    }, {
        timezone: 'UTC',
    });

    console.log('[fifo-cron] Démarré (*/1 min)');
}

module.exports = { startFifoCron };
