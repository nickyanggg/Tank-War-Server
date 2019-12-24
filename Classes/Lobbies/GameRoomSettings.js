module.exports = class GameRoomSettings {
    constructor(gameMode, maxPlayers) {
        this.gameMode = gameMode;
        this.maxPlayers = maxPlayers;
        this.bulletIncrementPerFrame = 0.03;
        this.mpIncrementPerFrame = 1;  // 0.3
        this.maxBulletNum = 5;
        this.safeBoxHealth = this.gameMode == "Heist" ? 5000 : undefined;
    }
}
