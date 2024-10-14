const port = 9000;
const db = require('./models/index');
const app = require('./app');
// Start the server on the given port
db.instance.sync({force: false}).then(async () =>{
    console.log('Database connected and synchronized');
    app.listen(port, () => {
        console.log('Server is running on port', port)
    })
}).catch((e) => {
    console.error(e);
})
