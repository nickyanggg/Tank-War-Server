let shortID = require('shortid');

module.exports = class Player {
    constructor() {
        this.username = '';
        this.id = shortID.generate();
    }
}