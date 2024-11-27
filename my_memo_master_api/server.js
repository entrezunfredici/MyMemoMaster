require('dotenv').config();
const { instance } = require('./models');
const app = require('./app');

const PORT = process.env.PORT || 9000;

instance.sync({ force: false })
    .then(() => {
        console.log('Database connected and synchronized');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to the database:', error);
    });
