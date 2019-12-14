let Connection = require('../Connection')

module.exports = class LobbyBase {
    constructor(id) {
        this.id = id;
        this.connections = [];
    }

    onUpdate(rooms) {

        let lobby = this;
        lobby.updateBaseLobby(rooms);
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

    updateBaseLobby(rooms) {
        let lobby = this;
        let connections = lobby.connections;
        let returnData = []

        for (let id in rooms) {
            let data = {
                id: rooms[id].id,
                player_num: rooms[id].connections.length,
                maxPlayers: rooms[id].settings.maxPlayers,
                gameMode: rooms[id].settings.gameMode, 
                playing: rooms[id].playing
            }
            returnData.push(data);
        }

        connections.forEach(connection => {
            connection.socket.emit('updateBaseLobby', { gameRoomsInfo: returnData });
        });
    }
}