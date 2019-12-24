module.exports = class GameRoomSettings {
    constructor(gameMode, maxPlayers) {
        this.gameMode = gameMode;
        this.maxPlayers = maxPlayers;
        this.bulletIncrementPerFrame = 0.03;
        this.mpIncrementPerFrame = 0.5;  // 0.5
        this.maxBulletNum = 5;
        this.safeBoxHealth = this.gameMode == "Heist" ? 5000 : undefined;
        this.superMp = {
            "freeze": 100,
            "lifeTree": 60,
            "lightShield": 70,
            "sandStorm": 100,
            "portal": 70,
            "fireBall": 50
        };
        this.superList = ["lifeTree", "fireBall", "lightShield", "freeze", "sandStorm", "portal"];
    }
}
