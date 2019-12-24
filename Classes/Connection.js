module.exports = class Connection {
    constructor() {
        this.socket;
        this.player;
        this.server;
        this.lobby;
    }

    //Handles all our io events and where we should route them too to be handled
    createEvents() {
        let connection = this;
        let socket = connection.socket;
        let server = connection.server;
        let player = connection.player;
        
        socket.on('disconnect', function() {
            server.onDisconnected(connection);
        });

        // socket.on('joinGame', function() {
        //     server.onAttemptToJoinGame(connection);
        // });

        socket.on('fireBullet', function(data) {
            if (!connection.lobby.gameOver) {
                connection.lobby.onFireBullet(connection, data);
            }
        });

        socket.on('useSuper', function(data) {
            if (!connection.lobby.gameOver) {
                connection.lobby.onUseSuper(connection, data.superID);
            }
        });

        socket.on('collisionDestroy', function(data) {
            if (!connection.lobby.gameOver) {
                connection.lobby.onCollisionDestroy(connection, data);
            }
        });

        socket.on('fireBallCollision', function(data) {
            if (!connection.lobby.gameOver) {
                connection.lobby.onFireBallCollision(connection, data);
            }
        });

        socket.on('superItemCollision', function() {
            if (!connection.lobby.gameOver) {
                connection.lobby.onSuperItemCollision();
            }
        });

        socket.on('updatePosition', function(data) {
            if (!connection.lobby.gameOver) {
                const inGamePlayerInfo = connection.lobby.inGamePlayersInfo[player.id];
                inGamePlayerInfo.position.x = data.position.x;
                inGamePlayerInfo.position.y = data.position.y;

                socket.broadcast.to(connection.lobby.id).emit('updatePosition', inGamePlayerInfo);
            }
        });

        socket.on('updateRotation', function(data) {
            if (!connection.lobby.gameOver) {
                const inGamePlayerInfo = connection.lobby.inGamePlayersInfo[player.id];
                inGamePlayerInfo.tankRotation = data.tankRotation;
                inGamePlayerInfo.barrelRotation = data.barrelRotation;

                socket.broadcast.to(connection.lobby.id).emit('updateRotation', inGamePlayerInfo);
            }
        });

        // after login
        socket.on('joinBaseLobby', function(data) {
            player.username = data['username'];
            server.onJoinBaseLobby(connection);
        });

        // leave game room to base lobby
        socket.on('switchToBaseLobby', function() {
            server.onSwitchToBaseLobby(connection);
        });

        socket.on('createGameRoom', function(data) {
            server.onCreateGameRoom(connection, data);
        });

        socket.on('joinGameRoom', function(data) {
            server.onJoinGameRoom(connection, data);
        });

        socket.on('switchTeam', function(data) {
            server.onSwitchTeam(connection, data.team);
        });

        socket.on('switchReady', function() {
            server.onSwitchReady(connection);
        });

        socket.on('switchTank', function(data) {
        	server.onSwitchTank(connection, data.direction);
        });

        socket.on('initSafeBoxes', function(data) {
        	server.onInitSafeBoxes(connection, data);
        });

        socket.on('finishPlaying', function() {
            connection.lobby.playing = false;
        });
    }
}
