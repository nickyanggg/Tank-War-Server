let shortID = require('shortid');
let Vector2 = require('./Vector2');

module.exports = class ServerObject {
    constructor() {
        this.id = shortID.generate();
        this.name = 'ServerObject';
        this.position = new Vector2();
    }
}