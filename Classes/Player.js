let shortID = require('shortid');
let Vector2 = require('./Vector2');

module.exports = class Player {
    constructor() {
        this.username = '';
        this.id = shortID.generate();
        this.position = new Vector2();
        this.tankRotation = new Number(0);
        this.barrelRotation = new Number(0);
    }
}