let Connection = require('./Connection');
let Player = require('./Player');

//Lobbies
let LobbyBase = require('./Lobbies/LobbyBase');
let GameRoom = require('./Lobbies/GameRoom');
let GameRoomSettings = require('./Lobbies/GameRoomSettings');

module.exports = class Server {
    constructor() {
        this.connections = [];
        this.rooms = [];
        this.baseLobby = new LobbyBase(-1);
        // this.rooms[0] = new LobbyBase(0);
    }

    //Interval update every 100 milliseconds
    onUpdate() {
        let server = this;

        //Update each room
        for (let id in server.rooms) {
            server.rooms[id].onUpdate();
        }

        server.baseLobby.onUpdate(server.rooms);
    }

    //Handle a new connection to the server
    onConnected(socket) {
        let server = this;
        let connection = new Connection();
        connection.socket = socket;
        connection.player = new Player();
        connection.server = server;

        let player = connection.player;
        let rooms = server.rooms;

        console.log('Added new player to the server (' + player.id + ')');
        server.connections[player.id] = connection;

        socket.join(player.lobby);
        // connection.lobby = rooms[player.lobby];
        connection.lobby = server.baseLobby;
        connection.lobby.onEnterLobby(connection);

        return connection;
    }

    onDisconnected(connection=Connection) {
        let server = this;
        let id = connection.player.id;

        delete server.connections[id];
        console.log('Player ' + connection.player.displayerPlayerInformation() + ' has disconnected');

        //Tell Other players currently in the lobby that we have disconnected from the game
        connection.socket.broadcast.to(connection.player.lobby).emit('disconnected', {
            id: id
        });

        //Preform lobby clean up
        if (connection.player.lobby === -1) {
            server.baseLobby.onLeaveLobby(connection);
        } else {
            server.rooms[connection.player.lobby].onLeaveRoom(connection);
        }
    }

    onJoinBaseLobby(connection=Connection) {
        connection.socket.emit('loadBaseLobby');
    }

    onCreateGameRoom(connection=Connection, data) {
        let server = this;
        let gameRoom = new GameRoom(server.rooms.length, new GameRoomSettings(data.gameMode, data.maxPlayers));

        server.rooms.push(gameRoom);
        server.onSwitchGameRoom(connection, gameRoom.id);
    }

    onJoinGameRoom(connection=Connection, data) {
        let server = this;
        server.onSwitchGameRoom(connection, data.id);
    }

    // onAttemptToJoinGame(connection=Connection) {
    //     //Look through lobbies for a gameRoom
    //     //check if joinable
    //     //if not make a new game
    //     let server = this;
    //     let lobbyFound = false;

    //     let gameRooms = server.rooms.filter(item => {
    //         return item instanceof GameRoom;
    //     });
    //     console.log('Found (' + gameRooms.length + ') lobbies on the server');

    //     gameRooms.forEach(lobby => {
    //         if (!lobbyFound) {
    //             let canJoin = lobby.canEnterLobby(connection);

    //             if (canJoin) {
    //                 lobbyFound = true;
    //                 server.onSwitchLobby(connection, lobby.id);
    //             }
    //         }
    //     });

    //     //All game lobbies full or we have never created one
    //     if (!lobbyFound) {
    //         console.log('Making a new game lobby');
    //         let gameRoom = new GameRoom(gameRooms.length + 1, new GameRoomSettings('FFA', 2));
    //         server.rooms.push(gameRoom);
    //         server.onSwitchLobby(connection, gameRoom.id);
    //     }
    // }

    // onSwitchLobby(connection=Connection, roomID) {
    //     let server = this;
    //     let rooms = server.rooms;

    //     connection.socket.join(roomID); // Join the new lobby's socket channel
    //     connection.lobby = rooms[roomID];//assign reference to the new lobby

    //     rooms[connection.player.lobby].onLeaveLobby(connection);
    //     rooms[roomID].onEnterLobby(connection);
    // }

    onSwitchGameRoom(connection=Connection, roomID) {
        let server = this;
        let rooms = server.rooms;

        connection.socket.join(roomID);
        connection.lobby = rooms[roomID];

        server.baseLobby.onLeaveLobby(connection);
        rooms[roomID].onEnterRoom(connection);
    }

    onSwitchTeam(connection=Connection, team) {
        let lobby = connection.lobby;
        let player = connection.player;

        // disallow switch team if player is ready or try to switch to the same team
        if (player.ready || team == player.team) {
            return;
        }

        if (player.team == 'blue' && lobby.orange_remain > 0) {
            player.team = 'orange';
            lobby.blue_remain += 1;
            lobby.orange_remain -= 1;
        } else if (player.team == 'orange' && lobby.blue_remain > 0) {
            player.team = 'blue';
            lobby.orange_remain += 1;
            lobby.blue_remain -= 1;
        }
    }

    onSwitchReady(connection=Connection) {
        let player = connection.player;
        player.ready = !player.ready;
    }

    onSwitchTank(connection=Connection, direction) {
        let player = connection.player;
        if (direction == "left") {
            player.tank = (player.tank + 5) % 6;
        } else if (direction == "right") {
            player.tank = (player.tank + 1) % 6;
        } else {
            console.error("onSwitchTank: unknown direction");
        }
    }
}
