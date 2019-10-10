let io = require('socket.io')(process.env.PORT || 52300);
let Player = require('./Classes/Player');

console.log('Server has started');

let players = [];
let sockets = [];

io.on('connection', function(socket) {
    console.log('Connection made!');

    let player = new Player();
    let thisPlayerID = player.id;

    players[thisPlayerID] = player;
    sockets[thisPlayerID] = socket;

    socket.emit('register', {id: thisPlayerID});
    socket.emit('spawn', player);
    socket.broadcast.emit('spawn', player);

    for (let playerID in players) {
        if (playerID !== thisPlayerID) {
            socket.emit('spawn', players[playerID]);
        }
    }

    socket.on('disconnect', function() {
        console.log('A player has disconnected');
        delete players[thisPlayerID];
        delete sockets[thisPlayerID];
        socket.broadcast.emit('disconnected', player);
    });
});