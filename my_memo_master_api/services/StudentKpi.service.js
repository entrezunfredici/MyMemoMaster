// services/StudentKpi.service.js
const { StudentKpi, LeitnerCard, LeitnerBox } = require("../models/index");
const { Op } = require("sequelize");

// Box level → score normalisé sur 100
const BOX_SCORE_MAP = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100 };
const MAX_RANGE_DAYS = 90;

class StudentKpiService {

    _buildDateFilter(startdate, stopdate) {
        const filter = {};
        if (startdate || stopdate) {
            filter.createdAt = {};
            if (startdate) filter.createdAt[Op.gte] = new Date(startdate);
            if (stopdate) filter.createdAt[Op.lte] = new Date(stopdate);
        }
        return filter;
    }

    _clampDateRange(startdate, stopdate) {
        const stop = stopdate ? new Date(stopdate) : new Date();
        const start = startdate ? new Date(startdate) : (() => {
            const d = new Date(stop);
            d.setDate(d.getDate() - 30);
            return d;
        })();

        const diffDays = Math.ceil((stop - start) / (1000 * 60 * 60 * 24));
        if (diffDays > MAX_RANGE_DAYS) {
            start.setTime(stop.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
        }
        return { start, stop };
    }

    async compute(userId, query = {}) {
        const { subjectId, startdate, stopdate } = query;
        const { start, stop } = this._clampDateRange(startdate, stopdate);

        const where = {
            userId,
            createdAt: { [Op.between]: [start, stop] },
        };
        if (subjectId) where.subjectId = subjectId;

        // Récupère les enregistrements avec la box courante de la carte
        const records = await StudentKpi.findAll({
            where,
            include: [
                {
                    model: LeitnerCard,
                    as: "leitnerCard",
                    attributes: ["leitnerCardId", "currentBox"],
                    include: [
                        {
                            model: LeitnerBox,
                            as: "leitnerBox",
                            attributes: ["level"],
                        },
                    ],
                },
            ],
        });

        const sessionsCount = records.length;

        // Distribution 1..5
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalScore = 0;

        for (const record of records) {
            const level = record.leitnerCard?.leitnerBox?.level ?? 1;
            const clamped = Math.min(5, Math.max(1, level));
            distribution[clamped]++;
            totalScore += BOX_SCORE_MAP[clamped];
        }

        const masteryAvg = sessionsCount > 0
            ? Math.round(totalScore / sessionsCount)
            : 0;

        // Timeseries — agrégation par jour
        const timeseriesMap = {};
        for (const record of records) {
            const day = record.createdAt.toISOString().split("T")[0];
            if (!timeseriesMap[day]) timeseriesMap[day] = { date: day, count: 0, scoreSum: 0 };
            const level = record.leitnerCard?.leitnerBox?.level ?? 1;
            const clamped = Math.min(5, Math.max(1, level));
            timeseriesMap[day].count++;
            timeseriesMap[day].scoreSum += BOX_SCORE_MAP[clamped];
        }

        const timeseries = Object.values(timeseriesMap)
            .map(({ date, count, scoreSum }) => ({
                date,
                count,
                masteryAvg: Math.round(scoreSum / count),
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            masteryAvg,
            masteryDistribution: distribution,
            sessionsCount,
            timeseries,
        };
    }

    async findAll(userId, query = {}) {
        const { subjectId, startdate, stopdate } = query;
        const { start, stop } = this._clampDateRange(startdate, stopdate);

        const where = {
            userId,
            createdAt: { [Op.between]: [start, stop] },
        };
        if (subjectId) where.subjectId = subjectId;

        return StudentKpi.findAll({ where, order: [["createdAt", "DESC"]] });
    }

    async create(userId, data) {
        return StudentKpi.create({
            leitnerCardId: data.leitnerCardId,
            subjectId: data.subjectId ?? null,
            userId,        // forcé — jamais depuis le client
        });
    }

    async findOne(studentKpiId, userId) {
        return StudentKpi.findOne({
            where: { studentKpiId, userId },
        });
    }

    async update(studentKpiId, userId, data) {
        await StudentKpi.update(
            { subjectId: data.subjectId },
            { where: { studentKpiId, userId } }
        );
        return this.findOne(studentKpiId, userId);
    }

    async delete(studentKpiId, userId) {
        return StudentKpi.destroy({
            where: { studentKpiId, userId },
        });
    }
}

module.exports = new StudentKpiService();