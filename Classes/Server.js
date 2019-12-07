let Connection = require('./Connection');
let Player = require('./Player');

//Lobbies
let LobbyBase = require('./Lobbies/LobbyBase');
let GameLobby = require('./Lobbies/GameLobby');
let GameLobbySettings = require('./Lobbies/GameLobbySettings');

module.exports = class Server {
    constructor() {
        this.connections = [];
        this.lobbys = [];
        this.baseLobby = new LobbyBase(-1);
        // this.lobbys[0] = new LobbyBase(0);
    }

    //Interval update every 100 milliseconds
    onUpdate() {
        let server = this;

        //Update each lobby
        for (let id in server.lobbys) {
            server.lobbys[id].onUpdate();
        }

        server.baseLobby.onUpdate(server.lobbys);
    }

    //Handle a new connection to the server
    onConnected(socket) {
        let server = this;
        let connection = new Connection();
        connection.socket = socket;
        connection.player = new Player();
        connection.server = server;

        let player = connection.player;
        let lobbys = server.lobbys;

        console.log('Added new player to the server (' + player.id + ')');
        server.connections[player.id] = connection;

        socket.join(player.lobby);
        // connection.lobby = lobbys[player.lobby];
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
            server.lobbys[connection.player.lobby].onLeaveLobby(connection);
        }
    }

    onJoinBaseLobby(connection=Connection) {
        connection.socket.emit('loadBaseLobby');
    }

    onCreateGameLobby(connection=Connection, data) {
        let server = this;
        let gamelobby = new GameLobby(server.lobbys.length, new GameLobbySettings(data.gameMode, data.maxPlayers));

        server.lobbys.push(gamelobby);
        server.onSwitchGameLobby(connection, gamelobby.id);
    }

    onJoinGameLobby(connection=Connection, data) {
        let server = this;
        server.onSwitchGameLobby(connection, data.id);
    }

    // onAttemptToJoinGame(connection=Connection) {
    //     //Look through lobbies for a gamelobby
    //     //check if joinable
    //     //if not make a new game
    //     let server = this;
    //     let lobbyFound = false;

    //     let gameLobbies = server.lobbys.filter(item => {
    //         return item instanceof GameLobby;
    //     });
    //     console.log('Found (' + gameLobbies.length + ') lobbies on the server');

    //     gameLobbies.forEach(lobby => {
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
    //         let gamelobby = new GameLobby(gameLobbies.length + 1, new GameLobbySettings('FFA', 2));
    //         server.lobbys.push(gamelobby);
    //         server.onSwitchLobby(connection, gamelobby.id);
    //     }
    // }

    // onSwitchLobby(connection=Connection, lobbyID) {
    //     let server = this;
    //     let lobbys = server.lobbys;

    //     connection.socket.join(lobbyID); // Join the new lobby's socket channel
    //     connection.lobby = lobbys[lobbyID];//assign reference to the new lobby

    //     lobbys[connection.player.lobby].onLeaveLobby(connection);
    //     lobbys[lobbyID].onEnterLobby(connection);
    // }

    onSwitchGameLobby(connection=Connection, lobbyID) {
        let server = this;
        let lobbys = server.lobbys;

        connection.socket.join(lobbyID);
        connection.lobby = lobbys[lobbyID];

        server.baseLobby.onLeaveLobby(connection);
        lobbys[lobbyID].onEnterLobby(connection);
    }

    onSwitchTeam(connection=Connection) {
        let lobby = connection.lobby;
        let player = connection.player;

        if (player.team == 'blue' && lobby.orange > 0) {
            player.team = 'orange';
            lobby.blue += 1;
            lobby.orange -= 1;
        } else if (player.team == 'orange' && lobby.blue > 0) {
            player.team = 'blue';
            lobby.orange += 1;
            lobby.blue -= 1;
        }
    }

    onSwitchReady(connection=Connection) {
        let player = connection.player;
        player.ready = !player.ready;
    }
}