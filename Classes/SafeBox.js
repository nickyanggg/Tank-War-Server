const ServerObject = require('./ServerObject');

module.exports = class SafeBox extends ServerObject {
	constructor(config) {
		super();
		this.name = "SafeBox";
        this.health = config.health;
        this.fullHealth = this.health;
		this.team = config.team;
		this.position.x = config.position.x;
        this.position.y = config.position.y;
        this.isDead = false;
    }
    
    dealDamage(amount) {
        console.log(`Dealing ${amount} damage to safebox: ${this.team}`);

        this.health = this.health - amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
        }

        return this.isDead;
    }
};
