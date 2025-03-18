const board = document.getElementById('game-board');
const status = document.getElementById('status');
let cells = [];
let currentPlayer = null;
let playerId = null;

const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'join', gameMode: 'xox' }));
    status.textContent = 'Bağlanıyor...';
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'start') {
        playerId = data.playerId;
        currentPlayer = data.role === 'player1' ? 'X' : 'O';
        status.textContent = `Sen ${currentPlayer}'sin. Skor: 0 - 0. ${data.role === 'player1' ? 'Sıra sende!' : 'Rakibi bekliyorsun...'}`;
    } else if (data.type === 'move') {
        cells[data.index].textContent = data.player;
        cells[data.index].classList.add(data.player.toLowerCase());
        status.textContent = currentPlayer === data.player ? 'Rakibi bekliyorsun...' : 'Sıra sende!';
    } else if (data.type === 'win') {
        status.textContent = `${data.player} kazandı! Skor: ${data.scores.player1} - ${data.scores.player2}`;
        highlightWinner(data.winningCells);
        cells.forEach(cell => cell.style.pointerEvents = 'none');
    }
};

// Oyun tahtasını oluştur
for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.addEventListener('click', () => {
        if (cell.textContent === '' && currentPlayer && status.textContent.includes('Sıra sende')) {
            socket.send(JSON.stringify({ type: 'move', index: i, player: currentPlayer }));
        }
    });
    board.appendChild(cell);
    cells.push(cell);
}

function highlightWinner(winningCells) {
    winningCells.forEach(index => {
        cells[index].style.backgroundColor = '#90ee90';
        cells[index].style.transition = 'background-color 0.5s';
    });
}