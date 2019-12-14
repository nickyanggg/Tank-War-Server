let LobbyBase = require('./LobbyBase');
let GameRoomSettings = require('./GameRoomSettings');
let Connection = require('../Connection');
let Bullet = require('../Bullet');

module.exports = class GameRoom extends LobbyBase {
    constructor(id, settings=GameRoomSettings) {
        super(id);
        this.settings = settings;
        this.playing = false;
        this.blue_remain = 3;
        this.orange_remain = 3;
        this.bullets = [];

        // after all players ready, countdown 5 sec then emit start game
        this.allReadyTimeout = undefined;
    }

    onUpdate() {
        let room = this;

        if (room.playing) {
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

        super.onLeaveRoom(connection);

        room.removePlayer(connection);

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
        if (allReady && this.blue_remain == this.orange_remain) {
            if (!this.allReadyTimeout) {
                this.allReadyTimeout = setTimeout(this.emitStartGame, 5000);
            }
        }
        // else, stop the timer
        else {
            clearTimeout(this.allReadyTimeout);
            this.allReadyTimeout = undefined;
        }
    }

    emitStartGame() {
        console.log("Game Start!");
    }

    updateBullets() {
        let room = this;
        let bullets = room.bullets;
        let connections = room.connections;

        bullets.forEach(bullet => {
            let isDestroyed = bullet.onUpdate();

            if (isDestroyed) {
                room.despawnBullet(bullet);
            } else {
                // let returnData = {
                //     id: bullet.id,
                //     position: {
                //         x: bullet.position.x,
                //         y: bullet.position.y
                //     }
                // }

                // connections.forEach(connection => {
                //     connection.socket.emit('updatePosition', returnData);
                // });
            }
        });

    }

    updateDeadPlayers() {
        let room = this;
        let connections = room.connections;

        connections.forEach(connection => {
            let player = connection.player;

            if (player.isDead) {
                let isRespawn = player.respawnCounter();
                if (isRespawn) {
                    let socket = connection.socket;
                    let returnData = {
                        id: player.id,
                        position: {
                            x: player.position.x,
                            y: player.position.y
                        }
                    }

                    socket.emit('playerRespawn', returnData);
                    socket.broadcast.to(room.id).emit('playerRespawn', returnData);
                }
            }
        });
    }

    onFireBullet(connection=Connection, data) {
        let room = this;

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

        connection.socket.emit('serverSpawn', returnData);
        connection.socket.broadcast.to(room.id).emit('serverSpawn', returnData); //Only broadcast to those in the same room as us
    }

    onCollisionDestroy(connection=Connection, data) {
        let room = this;

        let returnBullets = room.bullets.filter(bullet => {
            return bullet.id == data.id
        });

        returnBullets.forEach(bullet => {
            let playerHit = false;

            room.connections.forEach(c => {
                let player = c.player;

                if (bullet.activator != player.id) {
                    let distance = bullet.position.Distance(player.position);

                    if (distance < 0.65) {
                        let isDead = player.dealDamage(50);
                        if (isDead) {
                            console.log('Player with id: ' + player.id + ' has died');
                            let returnData = {
                                id: player.id
                            }
                            c.socket.emit('playerDied', returnData);
                            c.socket.broadcast.to(room.id).emit('playerDied', returnData);
                        } else {
                            console.log('Player with id: ' + player.id + ' has (' + player.health + ') health left');
                        }
                        room.despawnBullet(bullet);
                    }
                }
            });

            if (!playerHit) {
                bullet.isDestroyed = true;
            }
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
                connection.socket.emit('serverUnspawn', returnData);
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

        // socket.emit('spawn', returnData); //tell myself I have spawned
        // socket.broadcast.to(room.id).emit('spawn', returnData); // Tell others

        // //Tell myself about everyone else already in the room
        // connections.forEach(c => {
        //     if(c.player.id != connection.player.id) {
        //         socket.emit('spawn', {
        //             id: c.player.id
        //         });
        //     }
        // });

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

        // connection.socket.broadcast.to(room.id).emit('disconnected', {
        //     id: connection.player.id
        // });

        if (player.team == 'blue') {
            room.blue_remain += 1;
        } else if (player.team == 'orange') {
            room.orange_remain += 1;
        }

        connection.socket.broadcast.to(room.id).emit('leaveGameRoom', {
            id: connection.player.id
        });
    }
}
