module.exports = class GameRoomSettings {
    constructor(gameMode, maxPlayers) {
        this.gameMode = gameMode;
        this.maxPlayers = maxPlayers;
        this.bulletIncrementPerFrame = 0.03;
        this.mpIncrementPerFrame = 1;  // 0.3
        this.maxBulletNum = 5;
        this.safeBoxHealth = this.gameMode == "Heist" ? 500 : undefined;
        this.superMp = {
            "freeze": 100,
            "lifeTree": 100,
            "lightShield": 70,
            "sandStorm": 100,
            "portal": 100,
            "fireBall": 80
        };
        this.superList = ["lifeTree", "fireBall", "lightShield", "freeze", "sandStorm", "portal"];
    }
}
