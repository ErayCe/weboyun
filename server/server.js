const WebSocket = require('ws');
const server = new WebSocket.Server({ port: process.env.PORT || 8080 });

let rooms = new Map();

function createRoom() {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms.set(roomId, { players: [], xoxGameState: Array(9).fill(null), xoxScores: { player1: 0, player2: 0 }, pongGameState: { paddle1Y: 150, paddle2Y: 150, ball: { x: 400, y: 200, dx: 5, dy: 5, radius: 10 }, player1Score: 0, player2Score: 0 } });
    return roomId;
}

server.on('connection', (socket) => {
    let playerId = Date.now().toString();
    let roomId = null;
    socket.playerId = playerId;

    socket.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'join') {
            if (!roomId) {
                roomId = createRoom();
                const role = 'player1';
                rooms.get(roomId).players.push({ socket, playerId, role, gameMode: data.gameMode });
                socket.send(JSON.stringify({ type: 'start', role, playerId, roomId, gameMode: data.gameMode, status: 'waiting' }));
            } else if (rooms.get(roomId).players.length < 2) {
                const role = 'player2';
                rooms.get(roomId).players.push({ socket, playerId, role, gameMode: data.gameMode });
                rooms.get(roomId).players.forEach(p => p.socket.send(JSON.stringify({ type: 'start', role: p.role, playerId: p.playerId, roomId, gameMode: p.gameMode, status: 'ready' })));
            }
        } else if (data.type === 'move' && rooms.get(roomId)) {
            const room = rooms.get(roomId);
            const player = room.players.find(p => p.playerId === playerId);
            if (data.gameMode === 'xox' && player.role === (room.xoxCurrentTurn || 'player1')) {
                if (!room.xoxGameState[data.index]) {
                    room.xoxGameState[data.index] = player.role === 'player1' ? 'X' : 'O';
                    room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'move', index: data.index, player: room.xoxGameState[data.index], roomId })));

                    const winner = checkWinner(room.xoxGameState);
                    if (winner) {
                        const winningCells = getWinningCells(room.xoxGameState);
                        room.xoxScores[player.role === 'player1' ? 'player1' : 'player2']++;
                        room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'win', player: winner, winningCells, scores: room.xoxScores, roomId })));
                        room.xoxGameState = Array(9).fill(null);
                        room.xoxCurrentTurn = 'player1';
                    } else {
                        room.xoxCurrentTurn = room.xoxCurrentTurn === 'player1' ? 'player2' : 'player1';
                    }
                }
            } else if (data.gameMode === 'pong') {
                if (player.role === 'player1') {
                    room.pongGameState.paddle1Y = Math.max(0, Math.min(300, data.paddle1Y));
                    updatePong(roomId);
                } else if (player.role === 'player2') {
                    room.pongGameState.paddle2Y = Math.max(0, Math.min(300, data.paddle2Y));
                    updatePong(roomId);
                }
            }
        }
    });

    socket.on('close', () => {
        if (roomId && rooms.has(roomId)) {
            rooms.get(roomId).players = rooms.get(roomId).players.filter(p => p.playerId !== playerId);
            if (rooms.get(roomId).players.length === 0) {
                rooms.delete(roomId);
            } else {
                rooms.get(roomId).players.forEach(p => p.socket.send(JSON.stringify({ type: 'end', roomId, message: 'Rakip bağlantıyı kesti.' })));
            }
        }
    });
});

function checkWinner(gameState) {
    const winConditions = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            return gameState[a];
        }
    }
    return null;
}

function getWinningCells(gameState) {
    const winConditions = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let condition of winConditions) {
        const [a, b, c] = condition;
        if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
            return [a, b, c];
        }
    }
    return [];
}

function updatePong(roomId) {
    const room = rooms.get(roomId);
    const state = room.pongGameState;
    state.ball.x += state.ball.dx;
    state.ball.y += state.ball.dy;

    if (state.ball.x < 20 && state.ball.y > state.paddle1Y && state.ball.y < state.paddle1Y + 100) {
        let collidePoint = state.ball.y - (state.paddle1Y + 50);
        let angle = (collidePoint / 50) * Math.PI / 3;
        state.ball.dx = 6 * Math.cos(angle);
        state.ball.dy = 6 * Math.sin(angle);
    }
    if (state.ball.x > 780 && state.ball.y > state.paddle2Y && state.ball.y < state.paddle2Y + 100) {
        let collidePoint = state.ball.y - (state.paddle2Y + 50);
        let angle = (collidePoint / 50) * Math.PI / 3;
        state.ball.dx = -6 * Math.cos(angle);
        state.ball.dy = 6 * Math.sin(angle);
    }

    if (state.ball.y + state.ball.radius > 400 || state.ball.y - state.ball.radius < 0) {
        state.ball.dy = -state.ball.dy * 1.1;
    }

    if (state.ball.x < 0) {
        state.player2Score++;
        resetBall(roomId);
    } else if (state.ball.x > 800) {
        state.player1Score++;
        resetBall(roomId);
    }

    if (!room.players.find(p => p.role === 'player2')) {
        state.paddle2Y += (state.ball.y - (state.paddle2Y + 50)) * 0.1;
        state.paddle2Y = Math.max(0, Math.min(300, state.paddle2Y));
    }

    room.players.forEach(p => p.socket.send(JSON.stringify({ type: 'update', paddle1Y: state.paddle1Y, paddle2Y: state.paddle2Y, ball: state.ball, player1Score: state.player1Score, player2Score: state.player2Score, roomId })));
}

function resetBall(roomId) {
    const room = rooms.get(roomId);
    room.pongGameState.ball = { x: 400, y: 200, dx: 5 * (Math.random() > 0.5 ? 1 : -1), dy: 5 * (Math.random() > 0.5 ? 1 : -1), radius: 10 };
}

setInterval(() => {
    rooms.forEach((room, roomId) => {
        if (room.gameMode === 'pong' && room.players.length > 0) updatePong(roomId);
    });
}, 1000 / 60);

console.log(`Sunucu ${process.env.PORT || 8080} portunda çalışıyor...`);