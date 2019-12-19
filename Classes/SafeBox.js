const ServerObject = require('./ServerObject');

module.exports = class SafeBox extends ServerObject {
	constructor(config) {
		super();
		this.name = "SafeBox";
		this.health = config.health;
		this.team = config.team;
		this.position.x = config.position.x;
		this.position.y = config.position.y;
	}
};
