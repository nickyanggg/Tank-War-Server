let Connection = require('../Connection')

module.exports = class LobbyBase {
    constructor(id) {
        this.id = id;
        this.connections = [];
    }

    onUpdate(lobbys) {

        let lobby = this;
        lobby.updateBaseLobby(lobbys);
    }

    onEnterLobby(connection=Connection) {
        let lobby = this;
        let player = connection.player;

        console.log('Player ' + player.displayerPlayerInformation() + ' has entered the lobby (' + lobby.id + ')');

        lobby.connections.push(connection);

        player.lobby = lobby.id;
        connection.lobby = lobby;
    }

    onLeaveLobby(connection=Connection) {
        let lobby = this;
        let player = connection.player;

        console.log('Player ' + player.displayerPlayerInformation() + ' has left the lobby (' + lobby.id + ')');

        connection.lobby = undefined;

        let index = lobby.connections.indexOf(connection);
        if (index > -1) {
            lobby.connections.splice(index, 1);
        }
    }

    updateBaseLobby(lobbys) {
        let lobby = this;
        let connections = lobby.connections;
        let returnData = []

        for (let id in lobbys) {
            let data = {
                id: lobbys[id].id,
                players: lobbys[id].connections.length,
                maxPlayers: lobbys[id].settings.maxPlayers,
                gameMode: lobbys[id].settings.gameMode, 
                playing: lobbys[id].playing
            }
            returnData.push(data);
        }

        connections.forEach(connection => {
            connection.socket.emit('updateBaseLobby', { lobbys: returnData.length, gameLobbys: returnData });
        });
    }
}