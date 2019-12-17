let shortID = require('shortid');
let Vector2 = require('./Vector2');

module.exports = class Player {
    constructor() {
        this.username = 'Default_Player';
        this.id = shortID.generate();
        this.lobby = -1; // Base Lobby

        this.tank = 0; // chosen tank id
        this.ready = false;
        this.team = ''; // blue or orange
    }

    displayerPlayerInformation() {
        let player = this;
        return '(' + player.username + ':' + player.id + ')';
    }
}
