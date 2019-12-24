const shortID = require('shortid');
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
        this.lightShield = false;
    }

    respawnCounter() {
        this.respawnTicker = this.respawnTicker + 1;

        if (this.respawnTicker >= 10) {
            this.respawnTicker = new Number(0);
            this.respawnTime = this.respawnTime + 1;

            if (this.respawnTime >= 8) {
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
        if (this.lightShield) {
            amount = amount * 0.3;
        }
        this.health = this.health - amount;

        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.respawnTicker = new Number(0);
            this.respawnTime = new Number(0);
        }

        return this.isDead;
    }

    heal(amount) {
        if (!this.isDead) {
            this.health = this.health + amount;
            if (this.health > this.fullHealth) {
                this.health = this.fullHealth
            }
        }
    }
}

module.exports = class GameRoom extends LobbyBase {
    constructor(id, settings=GameRoomSettings) {
        super(id);
        this.settings = settings;
        this.playing = false;   // from game start to back to game room
        this.gameOver = true;  // from game start to safe box explode
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

        if (!room.gameOver) {
            room.updateTime();
            room.updateMp();
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
                    this.resetReady.bind(this)();
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

    resetReady() {
        this.connections.forEach(c => {
            c.player.ready = false;
        });
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
            inGamePlayerInfo.mp = 0;
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
        this.connections.forEach(c => c.socket.emit('spawnGameObject', returnData));
        returnData = {
            name: this.orangeSafeBox.name,
            id: this.orangeSafeBox.id,
            team: this.orangeSafeBox.team,
            position: {
                x: this.orangeSafeBox.position.x,
                y: this.orangeSafeBox.position.y
            }
        }
        this.connections.forEach(c => c.socket.emit('spawnGameObject', returnData));
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
        this.gameOver = false;
        console.log(`GameRoom(${this.id}) start playing.`);
    }

    updateTime() {

    }

    updateMp() {
        this.connections.forEach(connection => {
            const prev = this.inGamePlayersInfo[connection.player.id].mp;
            const increment = this.settings.mpIncrementPerFrame 
                              * this.inGamePlayersInfo[connection.player.id].mpRate;
            const fullMp = this.inGamePlayersInfo[connection.player.id].fullMp;
            const mp = prev + increment > fullMp ? fullMp : prev + increment;
            this.inGamePlayersInfo[connection.player.id].mp = mp;

            connection.socket.emit('updateMp', { fullMp, mp });
        });
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

    damagePlayerOrSafeBox(hitObjectType, hitObjectID, activator, amount) {
        let returnData;
        switch (hitObjectType) {
            case "Tank":
                const playerInfo = this.inGamePlayersInfo[hitObjectID];
                const isDead = playerInfo.dealDamage(amount);
                returnData = {
                    id: playerInfo.id,
                    health: playerInfo.health
                };
                this.connections.forEach(c => c.socket.emit('setPlayerHealth', returnData));
                if (isDead) {
                    console.log('Player with id: ' + playerInfo.id + ' has died');
                    returnData = { id: playerInfo.id };
                    this.connections.forEach(c => c.socket.emit('playerDied', returnData));
                } else {
                    console.log('Player with id: ' + playerInfo.id + ' has (' + playerInfo.health + ') health left');
                }
                break;

            case "SafeBox":
                const activatorInfo = this.inGamePlayersInfo[activator];
                let explodeSafeBoxID = "";

                // if I am blue team, and I want to hit orange team's safe box...
                if (activatorInfo.team == "blue" && this.orangeSafeBox.id == hitObjectID) {
                    if (this.orangeSafeBox.dealDamage(amount)) {
                        explodeSafeBoxID = this.orangeSafeBox.id;
                    }
                    returnData = {
                        team: "orange",
                        health: this.orangeSafeBox.health,
                        fullHealth: this.orangeSafeBox.fullHealth
                    };
                }
                else if (activatorInfo.team == "orange" && this.blueSafeBox.id == hitObjectID) {
                    if (this.blueSafeBox.dealDamage(amount)) {
                        explodeSafeBoxID = this.blueSafeBox.id
                    }
                    returnData = {
                        team: "blue",
                        health: this.blueSafeBox.health,
                        fullHealth: this.blueSafeBox.fullHealth
                    };
                }
                else {
                    break;
                }
                this.connections.forEach(c => c.socket.emit('setSafeBoxHealth', returnData));
                // game over
                if (explodeSafeBoxID) {
                    this.gameOver = true;

                    console.log(`SafeBox: "${explodeSafeBoxID}" exploded`);
                    this.connections.forEach(c => c.socket.emit('safeBoxExplode', { explodeSafeBoxID: explodeSafeBoxID }));
                    setTimeout((() => {
                        console.log(`Game room: ${this.id} game over. Winner: ${activatorInfo.team}`);
                        this.connections.forEach(c => c.socket.emit('gameOver', { winTeam: activatorInfo.team }));
                        this.cleanUpPlayingGameRoom();
                    }).bind(this), 5000);
                }

                break;

            // other bullets or wall
            default:
                break;
        }
    }

    onCollisionDestroy(connection=Connection, data) {
        let room = this;

        let returnBullets = room.bullets.filter(bullet => {
            return bullet.id == data.bulletID;
        });

        returnBullets.forEach(bullet => {
            this.damagePlayerOrSafeBox(data.hitObjectType, data.hitObjectID, bullet.activator
                                  , this.inGamePlayersInfo[bullet.activator].attack);
            room.despawnBullet(bullet);
        });        
    }

    onFireBallCollision(connection=Connection, data) {
        this.damagePlayerOrSafeBox(data.hitObjectType, data.hitObjectID, data.activator, 350);
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

    cleanUpPlayingGameRoom() {
        this.inGamePlayersInfo = {};
        this.blueSafeBox = undefined;
        this.orangeSafeBox = undefined;
        this.bullets = [];
    }

    onUseSuper(connection=Connection, id) {
        console.log(`Client: ${id} wants to cast super`);
        let returnData = {
            id,
            team: this.inGamePlayersInfo[id].team,
            super: this.inGamePlayersInfo[id].super
        };
        connection.socket.emit('useSuper', returnData);
        connection.socket.broadcast.to(this.id).emit('useSuper', returnData);

        switch (this.inGamePlayersInfo[id].super) {
            case "freeze":
                // handled by client
                break;

            case "lifeTree":
                let count = 0;
                const interval = setInterval(() => {
                    if (count == 10) {
                        clearInterval(interval);
                    }
                    Object.values(this.inGamePlayersInfo).forEach(p => {
                        if (p.team == this.inGamePlayersInfo[id].team) {
                            p.heal(30);
                            returnData = {
                                id: p.id,
                                health: p.health
                            }
                            this.connections.forEach(c => c.socket.emit('setPlayerHealth', returnData));
                        }
                    });
                    count++;
                }, 500);
                break;

            case "lightShield":
                this.inGamePlayersInfo[id].lightShield = true;
                setTimeout(() => {
                    if (!this.gameOver) {
                        this.inGamePlayersInfo[id].lightShield = false;    
                    }
                }, 6000);
                break;

            case "sandStorm":
                // sandStorm effect handled by client
                Object.values(this.inGamePlayersInfo).forEach(p => {
                    if (p.team != this.inGamePlayersInfo[id].team) {
                        p.speed *= 0.7;
                        this.connections.forEach(c => {
                            if (c.player.id == p.id) {
                                c.socket.emit('setPlayerSpeed', { speed: p.speed });
                                setTimeout(() => {
                                    if (!this.gameOver) {
                                        p.speed /= 0.7;
                                        c.socket.emit('setPlayerSpeed', { speed: p.speed });
                                    }
                                }, 15000);
                            }
                        });
                    }
                });
                break;

            case "portal":
                const xOffset = -2 * Math.sin(this.inGamePlayersInfo[id].tankRotation * Math.PI / 180);
                const yOffset = 2 * Math.cos(this.inGamePlayersInfo[id].tankRotation * Math.PI / 180);
                const portal1x = this.inGamePlayersInfo[id].position.x + xOffset;
                const portal1y = this.inGamePlayersInfo[id].position.y + yOffset;
                const portal2x = portal1x + 3.5 * xOffset;
                const portal2y = portal1y + 3.5 * yOffset;
                const portalID1 = shortID.generate();
                const portalID2 = shortID.generate();

                this.connections.forEach(c => {
                    c.socket.emit('spawnGameObject', {
                        id: portalID1,
                        id2: portalID2,
                        team: this.inGamePlayersInfo[id].team,
                        position: { x: portal1x, y: portal1y },
                        position2: { x: portal2x, y: portal2y },
                        xOffset, yOffset,
                        name: "PortalPair"
                    });
                });

                setTimeout(() => {
                    if (!this.gameOver) {
                        this.connections.forEach(c => {
                            c.socket.emit('unspawnGameObject', { id: portalID1 });
                            c.socket.emit('unspawnGameObject', { id: portalID2 });
                        });
                    }
                }, 15000);
                break;

            case "fireBall":
                // fire ball flying handled by client
                break;

            default:
                console.error(`undefined super ${this.inGamePlayersInfo[id].super}`);
                break;
        }
    }
}
