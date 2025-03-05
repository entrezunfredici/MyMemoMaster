const { setWorldConstructor } = require("@cucumber/cucumber");

class CustomWorld {
    constructor() {
        this.response = null;
    }
}

setWorldConstructor(CustomWorld);