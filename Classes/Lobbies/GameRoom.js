const LobbyBase = require('./LobbyBase');
const GameRoomSettings = require('./GameRoomSettings');
const Connection = require('../Connection');
const Bullet = require('../Bullet');
const SafeBox = require('../SafeBox');
const Vector2 = require('../Vector2');
const tankSettings = require('../tankSettings');

class InGamePlayerInfo {
    constructor() {
        this.username = new String();
        this.id = new String();
        this.tank = new Number();
        this.team = new String();

        this.position = new Vector2();
        this.tankRotation = new Number();
        this.barrelRotation = new Number();
        this.isDead = false;
        this.respawnTicker = new Number();
        this.respawnTime = new Number();

        this.startPosition = new Number();   // 0, 1, 2: blue 123; 3, 4, 5: orange 123
        this.fullHealth = new Number();
        this.health = new Number();
        this.speed = new Number();
        this.fullMp = new Number();
        this.mp = new Number();
        this.mpRate = new Number();
        this.bulletRate = new Number();
        this.passiveSkill = new String();
        this.super = new String();
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
                 this.health = new Number(this.fullHealth);

                 return true;
            }
        }
        
        return false;
    }

    dealDamage(amount) {
        this.health = this.health - amount;

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.respawnTicker = new Number(0);
            this.respawnTime = new Number(0);
        }

        return this.isDead;
    }
}

module.exports = class GameRoom extends LobbyBase {
    constructor(id, settings=GameRoomSettings) {
        super(id);
        this.settings = settings;
        this.playing = false;
        this.blue_remain = 3;
        this.orange_remain = 3;
        this.bullets = [];

        // after all players ready, countdown 5 sec then emit start game
        this.startGameCountDownTime = 1000;
        this.allReadyTimeout = undefined;

        // map all players id to inGamePlayerInfo
        this.inGamePlayersInfo = {};

        this.blueSafeBox = undefined;
        this.orangeSafeBox = undefined;
    }

    onUpdate() {
        let room = this;

        if (room.playing) {
            room.updateTime();
            room.updateBullets();
            room.updateDeadPlayers();
        } else {
            room.updateGameRoom();
            room.checkReady();
        }
    }

    // canEnterRoom(connection=Connection) {
    //     let room = this;
    //     let maxPlayerCount = room.settings.maxPlayers;
    //     let currentPlayerCount = room.connections.length;

    //     if (currentPlayerCount + 1 > maxPlayerCount) {
    //         return false;
    //     }

    //     return true;
    // }

    onEnterRoom(connection=Connection) {
        let room = this;
        let socket = connection.socket;

        super.onEnterLobby(connection);

        room.spawnPlayerToGameRoom(connection);

        // socket.emit('loadGame');
        socket.emit('loadGameRoom', { id: room.id });

        //Handle spawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    onLeaveRoom(connection=Connection) {
        let room = this;

        room.removePlayer(connection);

        super.onLeaveLobby(connection);


        //Handle unspawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    updateGameRoom() {
        let room = this;
        let connections = room.connections;
        let playersData = [];
        connections.forEach(connection => {
            let player = connection.player;
            let playerData = {
                id: player.id,
                username: player.username,
                tank: player.tank,
                ready: player.ready,
                team: player.team
            }
            playersData.push(playerData);
        });

        // or maybe room owner broadcast ?
        connections.forEach(connection => {
            let socket = connection.socket;
            socket.emit('updateGameRoom', { playersData: playersData });
        });
    }

    checkReady() {
        let allReady = true;
        this.connections.forEach(connection => {
            if (!connection.player.ready) {
                allReady = false;
            }
        });

        // if all players are ready, start a timer
        if (allReady/* && this.blue_remain == this.orange_remain*/) {
            if (!this.allReadyTimeout) {
                this.allReadyTimeout = setTimeout(() => {
                    this.initPlayersInfo.bind(this)();
                    this.emitStartGame.bind(this)();
                }, this.startGameCountDownTime);
            }
        }
        // else, stop the timer
        else {
            clearTimeout(this.allReadyTimeout);
            this.allReadyTimeout = undefined;
        }
    }

    initPlayersInfo() {
        let blueCount = 0, orangeCount = 0;
        this.connections.forEach(connection => {
            let player = connection.player;
            this.inGamePlayersInfo[player.id] = new InGamePlayerInfo();
            let inGamePlayerInfo = this.inGamePlayersInfo[player.id];

            inGamePlayerInfo.username = player.username;
            inGamePlayerInfo.id = player.id;
            inGamePlayerInfo.tank = player.tank;
            inGamePlayerInfo.team = player.team;
            inGamePlayerInfo.fullHealth = tankSettings[player.tank].health;
            inGamePlayerInfo.health = inGamePlayerInfo.fullHealth;
            inGamePlayerInfo.attack = tankSettings[player.tank].attack;
            inGamePlayerInfo.speed = tankSettings[player.tank].speed;
            inGamePlayerInfo.fullMp = tankSettings[player.tank].mp;
            inGamePlayerInfo.mp = inGamePlayerInfo.fullMp;
            inGamePlayerInfo.mpRate = tankSettings[player.tank].mpRate;
            inGamePlayerInfo.bulletRate = tankSettings[player.tank].bulletRate;
            inGamePlayerInfo.bulletNum = tankSettings[player.tank].bulletNum;
            inGamePlayerInfo.passiveSkill = tankSettings[player.tank].passiveSkill;
            inGamePlayerInfo.super = tankSettings[player.tank].super;
            
            if (player.team == "orange") {
                inGamePlayerInfo.startPosition = orangeCount + 3;  // orange: 3/4/5
                orangeCount++;
            } else if (player.team == "blue") {
                inGamePlayerInfo.startPosition = blueCount;
                blueCount++;
            } else {
                console.error("initPlayersInfo: Undefined team");
            }
        });
    }

    initSafeBoxes(connection=Connection, data) {
        this.blueSafeBox = new SafeBox({
            health: this.settings.safeBoxHealth,
            team: "blue",
            position: {
                x: data.bluex,
                y: data.bluey
            }
        });
        this.orangeSafeBox = new SafeBox({
            health: this.settings.safeBoxHealth,
            team: "orange",
            position: {
                x: data.orangex,
                y: data.orangey
            }
        });

        // spawn blue and orange safe boxes
        let returnData = {
            name: this.blueSafeBox.name,
            id: this.blueSafeBox.id,
            team: this.blueSafeBox.team,
            position: {
                x: this.blueSafeBox.position.x,
                y: this.blueSafeBox.position.y
            }
        }
        connection.socket.emit('spawnGameObject', returnData);
        returnData = {
            name: this.orangeSafeBox.name,
            id: this.orangeSafeBox.id,
            team: this.orangeSafeBox.team,
            position: {
                x: this.orangeSafeBox.position.x,
                y: this.orangeSafeBox.position.y
            }
        }
        connection.socket.emit('spawnGameObject', returnData);
    }

    emitStartGame() {
        this.connections.forEach(connection => {
            let socket = connection.socket;
            socket.emit('gameStart', { gameMode: this.settings.gameMode });
            socket.emit('spawnPlayers', {
                playersInfo: Object.values(this.inGamePlayersInfo)
            });
        });

        this.playing = true;
        console.log(`GameRoom(${this.id}) start playing.`);
    }

    updateTime() {

    }

    updateBullets() {
        let bullets = this.bullets;
        let connections = this.connections;

        // update each player's bulletNum
        connections.forEach(connection => {
            const prev = this.inGamePlayersInfo[connection.player.id].bulletNum;
            const increment = this.settings.bulletIncrementPerFrame 
                              * this.inGamePlayersInfo[connection.player.id].bulletRate;
            const bulletNum = prev + increment > this.settings.maxBulletNum
                              ? this.settings.maxBulletNum : prev + increment;
            this.inGamePlayersInfo[connection.player.id].bulletNum = bulletNum;

            connection.socket.emit('updateBulletNum', { bulletNum });
        });

        // update bullet positions
        bullets.forEach(bullet => {
            let isDestroyed = bullet.onUpdate();

            if (isDestroyed) {
                this.despawnBullet(bullet);
            }
        });
    }

    updateDeadPlayers() {
        let room = this;
        let connections = room.connections;

        connections.forEach(connection => {
            let playerInfo = this.inGamePlayersInfo[connection.player.id];

            if (playerInfo.isDead) {
                let isRespawn = playerInfo.respawnCounter();
                if (isRespawn) {
                    let socket = connection.socket;
                    let returnData = {
                        id: playerInfo.id,
                        startPosition: playerInfo.startPosition
                    }

                    socket.emit('playerRespawn', returnData);
                    socket.broadcast.to(room.id).emit('playerRespawn', returnData);
                }
            }
        });
    }

    onFireBullet(connection=Connection, data) {
        let room = this;

        // if bulletNum < 1, cannot fire bullet
        if (room.inGamePlayersInfo[connection.player.id].bulletNum < 1) {
            return;
        }

        let bullet = new Bullet();
        bullet.name = 'Bullet';
        bullet.activator = data.activator;
        bullet.position.x = data.position.x;
        bullet.position.y = data.position.y;
        bullet.direction.x = data.direction.x;
        bullet.direction.y = data.direction.y;

        room.bullets.push(bullet);

        let returnData = {
            name: bullet.name,
            id: bullet.id,
            activator: bullet.activator,
            position: {
                x: bullet.position.x,
                y: bullet.position.y
            },
            direction: {
                x: bullet.direction.x,
                y: bullet.direction.y
            },
            speed: bullet.speed
        }

        connection.socket.emit('spawnGameObject', returnData);
        connection.socket.broadcast.to(room.id).emit('spawnGameObject', returnData); //Only broadcast to those in the same room as us

        // minus bullet num
        room.inGamePlayersInfo[connection.player.id].bulletNum -= 1;
    }

    onCollisionDestroy(connection=Connection, data) {
        let room = this;

        let returnBullets = room.bullets.filter(bullet => {
            return bullet.id == data.bulletID;
        });

        returnBullets.forEach(bullet => {
            let returnData;
            switch (data.hitObjectType) {
                case "Tank":
                    const playerInfo = room.inGamePlayersInfo[data.hitObjectID];
                    const isDead = playerInfo.dealDamage(room.inGamePlayersInfo[bullet.activator].attack);
                    returnData = {
                        id: playerInfo.id,
                        health: playerInfo.health
                    };
                    room.connections.forEach(c => c.socket.emit('setPlayerHealth', returnData));
                    if (isDead) {
                        console.log('Player with id: ' + playerInfo.id + ' has died');
                        returnData = { id: playerInfo.id };
                        room.connections.forEach(c => c.socket.emit('playerDied', returnData));
                    } else {
                        console.log('Player with id: ' + playerInfo.id + ' has (' + playerInfo.health + ') health left');
                    }
                    break;

                case "SafeBox":
                    const activatorInfo = room.inGamePlayersInfo[bullet.activator];
                    let winTeam = "";
                    if (activatorInfo.team == "blue") {
                        if (room.orangeSafeBox.dealDamage(activatorInfo.attack)) {
                            winTeam += "b";
                        }
                        returnData = {
                            team: "orange",
                            health: room.orangeSafeBox.health,
                            fullHealth: room.orangeSafeBox.fullHealth
                        };
                    }
                    else if (activatorInfo.team == "orange") {
                        if (room.blueSafeBox.dealDamage(activatorInfo.attack)) {
                            winTeam += "o";
                        }
                        returnData = {
                            team: "blue",
                            health: room.blueSafeBox.health,
                            fullHealth: room.blueSafeBox.fullHealth
                        };
                    }
                    else {
                        console.error("undefined activator team");
                    }
                    room.connections.forEach(c => c.socket.emit('setSafeBoxHealth', returnData));

                    // game over
                    if (winTeam) {
                        
                    }

                    break;
                
                // other bullets or wall
                default:
                    break;
            }
            room.despawnBullet(bullet);
        });        
    }

    despawnBullet(bullet=Bullet) {
        let room = this;
        let bullets = room.bullets;
        let connections = room.connections;

        console.log('Destroying bullet (' + bullet.id + ')');
        let index = bullets.indexOf(bullet);
        if (index > -1) {
            bullets.splice(index, 1);

            var returnData = {
                id: bullet.id
            }

            //Send remove bullet command to players
            connections.forEach(connection => {
                connection.socket.emit('unspawnGameObject', returnData);
            });
        }
    }

    spawnPlayerToGameRoom(connection=Connection) {
        let room = this;
        let connections = room.connections;
        let socket = connection.socket;
        if (room.blue_remain >= room.orange_remain) {
            room.blue_remain -= 1;
            connection.player.team = 'blue';
        } else {
            room.orange_remain -= 1;
            connection.player.team = 'orange';
        }

        let returnData = {
            id: connection.player.id,
            username: connection.player.username,
            tank: connection.player.tank,
            team: connection.player.team,
            ready: connection.player.ready
        }

        socket.emit('spawnToGameRoom', returnData);
        socket.broadcast.to(room.id).emit('spawnToGameRoom', returnData);

        connections.forEach(c => {
            if(c.player.id != connection.player.id) {
                socket.emit('spawnToGameRoom', {
                    id: c.player.id,
                    username: c.player.username,
                    tank: c.player.tank,
                    team: connection.player.team,
                    ready: connection.player.ready
                });
            }
        });
    }

    removePlayer(connection=Connection) {
        let room = this;
        let player = connection.player;

        if (player.team == 'blue') {
            room.blue_remain += 1;
        } else if (player.team == 'orange') {
            room.orange_remain += 1;
        }

        connection.socket.broadcast.to(room.id).emit('leaveGameRoom', {
            id: connection.player.id,
            playing: connection.lobby.playing
        });
    }
}
