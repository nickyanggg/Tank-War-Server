let LobbyBase = require('./LobbyBase');
let GameLobbySettings = require('./GameLobbySettings');
let Connection = require('../Connection');
let Bullet = require('../Bullet');

module.exports = class GameLobby extends LobbyBase {
    constructor(id, settings=GameLobbySettings) {
        super(id);
        this.settings = settings;
        this.playing = false;
        this.blue = 3;
        this.orange = 3;
        this.bullets = [];
    }

    onUpdate() {
        let lobby = this;

        if (lobby.playing) {
            lobby.updateBullets();
            lobby.updateDeadPlayers();
        } else {
            lobby.updateGameLobby();
        }
    }

    // canEnterLobby(connection=Connection) {
    //     let lobby = this;
    //     let maxPlayerCount = lobby.settings.maxPlayers;
    //     let currentPlayerCount = lobby.connections.length;

    //     if (currentPlayerCount + 1 > maxPlayerCount) {
    //         return false;
    //     }

    //     return true;
    // }

    onEnterLobby(connection=Connection) {
        let lobby = this;
        let socket = connection.socket;

        super.onEnterLobby(connection);

        lobby.addPlayer(connection);

        // socket.emit('loadGame');
        socket.emit('loadGameLobby', { id: lobby.id });

        //Handle spawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    onLeaveLobby(connection=Connection) {
        let lobby = this;

        super.onLeaveLobby(connection);

        lobby.removePlayer(connection);

        //Handle unspawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    updateGameLobby() {
        let lobby = this;
        let connections = lobby.connections;
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

        // or maybe lobby owner broadcast ?
        connections.forEach(connection => {
            let socket = connection.socket;
            socket.emit('updateGameLobby', { players: playersData.length, playersData: playersData });
        });
    }

    updateBullets() {
        let lobby = this;
        let bullets = lobby.bullets;
        let connections = lobby.connections;

        bullets.forEach(bullet => {
            let isDestroyed = bullet.onUpdate();

            if (isDestroyed) {
                lobby.despawnBullet(bullet);
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
        let lobby = this;
        let connections = lobby.connections;

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
                    socket.broadcast.to(lobby.id).emit('playerRespawn', returnData);
                }
            }
        });
    }

    onFireBullet(connection=Connection, data) {
        let lobby = this;

        let bullet = new Bullet();
        bullet.name = 'Bullet';
        bullet.activator = data.activator;
        bullet.position.x = data.position.x;
        bullet.position.y = data.position.y;
        bullet.direction.x = data.direction.x;
        bullet.direction.y = data.direction.y;

        lobby.bullets.push(bullet);

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
        connection.socket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Only broadcast to those in the same lobby as us
    }

    onCollisionDestroy(connection=Connection, data) {
        let lobby = this;

        let returnBullets = lobby.bullets.filter(bullet => {
            return bullet.id == data.id
        });

        returnBullets.forEach(bullet => {
            let playerHit = false;

            lobby.connections.forEach(c => {
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
                            c.socket.broadcast.to(lobby.id).emit('playerDied', returnData);
                        } else {
                            console.log('Player with id: ' + player.id + ' has (' + player.health + ') health left');
                        }
                        lobby.despawnBullet(bullet);
                    }
                }
            });

            if (!playerHit) {
                bullet.isDestroyed = true;
            }
        });        
    }

    despawnBullet(bullet=Bullet) {
        let lobby = this;
        let bullets = lobby.bullets;
        let connections = lobby.connections;

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

    addPlayer(connection=Connection) {
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;
        if (lobby.blue >= lobby.orange) {
            lobby.blue -= 1;
            connection.player.team = 'blue';
        } else {
            lobby.orange -= 1;
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
        // socket.broadcast.to(lobby.id).emit('spawn', returnData); // Tell others

        // //Tell myself about everyone else already in the lobby
        // connections.forEach(c => {
        //     if(c.player.id != connection.player.id) {
        //         socket.emit('spawn', {
        //             id: c.player.id
        //         });
        //     }
        // });

        socket.emit('spawnToGameLobby', returnData);
        socket.broadcast.to(lobby.id).emit('spawnToGameLobby', returnData);

        connections.forEach(c => {
            if(c.player.id != connection.player.id) {
                socket.emit('spawnToGameLobby', {
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
        let lobby = this;
        let player = connection.player;

        // connection.socket.broadcast.to(lobby.id).emit('disconnected', {
        //     id: connection.player.id
        // });

        if (player.team == 'blue') {
            lobby.blue += 1;
        } else if (player.team == 'orange') {
            lobby.orange += 1;
        }

        connection.socket.broadcast.to(lobby.id).emit('leaveGameLobby', {
            id: connection.player.id
        });
    }
}
