const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
let playerId = null;
let role = null;
let roomId = null;

const socket = new WebSocket('ws://direct-klara-oyunodalari-a7f93ea6.koyeb.app/'); // Yerel test için, globalde değiştireceğiz

socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', gameMode: 'pong' }));
    status.textContent = 'Rakip bekleniyor...';
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'start') {
        playerId = data.playerId;
        role = data.role;
        roomId = data.roomId;
        status.textContent = `Oyun başladı! Sen ${role === 'player1' ? 'Sol (W/S)' : 'Sağ (A/D)'}. Skor: 0 - 0. Oda: ${roomId}`;
    } else if (data.type === 'update') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, data.paddle1Y, 10, 100); // Sol paddle
        ctx.fillRect(canvas.width - 10, data.paddle2Y, 10, 100); // Sağ paddle
        ctx.beginPath();
        ctx.arc(data.ball.x, data.ball.y, data.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.fillText(`Skor: ${data.player1Score} - ${data.player2Score}`, canvas.width / 2 - 30, 20);
        status.textContent = `Oda: ${roomId}. ${role === 'player1' ? 'Sen (Sol)' : 'Rakip (Sağ)'}. Skor: ${data.player1Score} - ${data.player2Score}`;
    } else if (data.type === 'end') {
        status.textContent = data.message;
    }
};

document.addEventListener('keydown', (e) => {
    if (role === 'player1') {
        if (e.key === 'w' && pongGameState.paddle1Y > 0) pongGameState.paddle1Y -= 20;
        if (e.key === 's' && pongGameState.paddle1Y < canvas.height - 100) pongGameState.paddle1Y += 20;
        socket.send(JSON.stringify({ type: 'move', paddle1Y: pongGameState.paddle1Y, gameMode: 'pong', roomId }));
    } else if (role === 'player2') {
        if (e.key === 'a' && pongGameState.paddle2Y > 0) pongGameState.paddle2Y -= 20;
        if (e.key === 'd' && pongGameState.paddle2Y < canvas.height - 100) pongGameState.paddle2Y += 20;
        socket.send(JSON.stringify({ type: 'move', paddle2Y: pongGameState.paddle2Y, gameMode: 'pong', roomId }));
    }
});

let pongGameState = { paddle1Y: 150, paddle2Y: 150, ball: { x: 400, y: 200, dx: 5, dy: 5, radius: 10 } };