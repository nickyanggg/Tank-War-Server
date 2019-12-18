module.exports = class GameRoomSettings {
    constructor(gameMode, maxPlayers) {
        this.gameMode = gameMode;
        this.maxPlayers = maxPlayers;
        this.bulletIncrementPerFrame = 0.03;
        this.maxBulletNum = 5;
    }
}
