const { randomInt } = require('crypto');

module.exports = () => {
    return randomInt(100000, 1000000);
};
