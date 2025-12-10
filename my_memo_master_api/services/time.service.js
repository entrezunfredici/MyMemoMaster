// my_memo_master_api/services/time.service.js
const MS = {
    second: 1000,
    minute: 60 * 1000,
    hour:   60 * 60 * 1000,
    day:    24 * 60 * 60 * 1000,
    week:   7 * 24 * 60 * 60 * 1000,
};

function addInterval(baseDate, { amount, unit }) {
    if (!MS[unit]) throw new Error(`Unsupported unit: ${unit}`);
        return new Date(baseDate.getTime() + amount * MS[unit]);
}

module.exports = { addInterval };
