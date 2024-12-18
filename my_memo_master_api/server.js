const db = require("./models/index");
const app = require("./app");

db.instance.sync({ force: false }).then(async () => {
    console.log('\x1b[32m%s\x1b[0m', 'Database connected and synchronized');
    app.listen(process.env.API_PORT, () => {
        console.log('Server is running on:', `http://localhost:${process.env.API_PORT}`);
    })
}).catch((e) => {
    console.error(e);
})
