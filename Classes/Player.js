let shortID = require('shortid');
let Vector2 = require('./Vector2');

module.exports = class Player {
    constructor() {
        this.username = 'Default_Player';
        this.id = shortID.generate();
        // this.lobby = 0;
        this.lobby = -1; // Base Lobby
        this.position = new Vector2();
        this.tankRotation = new Number(0);
        this.barrelRotation = new Number(0);
        this.health = new Number(100);
        this.isDead = false;
        this.respawnTicker = new Number(0);
        this.respawnTime = new Number(0);

        this.tank = 0; // chosen tank id
        this.ready = false;
        this.team = ''; // blue or orange
    }

    displayerPlayerInformation() {
        let player = this;
        return '(' + player.username + ':' + player.id + ')';
    }

    respawnCounter() {
        this.respawnTicker = this.respawnTicker + 1;

        if (this.respawnTicker >= 10) {
            this.respawnTicker = new Number(0);
            this.respawnTime = this.respawnTime + 1;

            if (this.respawnTime >= 3) {
                console.log('Respawning player id: ' + this.id);
                 this.isDead = false;
                 this.respawnTicker = new Number(0);
                 this.respawnTime = new Number(0);
                 this.health = new Number(100);
                 this.position = new Vector2(-8, 3);

                 return true;
            }
        }
        
        return false;
    }

    dealDamage(amount = Number) {
        this.health = this.health - amount;

        if (this.health <= 0) {
            this.isDead = true;
            this.respawnTicker = new Number(0);
            this.respawnTime = new Number(0);
        }

        return this.isDead;
    }
}