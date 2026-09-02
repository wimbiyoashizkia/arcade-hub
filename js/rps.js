console.log('RPS loaded!');

const moves = {
  rock: { name: 'Rock', icon: '✊', beats: 'scissors' },
  paper: { name: 'Paper', icon: '✋', beats: 'rock' },
  scissors: { name: 'Scissors', icon: '✌️', beats: 'paper' }
};

let playerScore = 0;
let computerScore = 0;
const history = [];

const playerMoveEl = document.getElementById('playerMove');
const computerMoveEl = document.getElementById('computerMove');
const playerScoreEl = document.getElementById('playerScore');
const computerScoreEl = document.getElementById('computerScore');
const resultMessageEl = document.getElementById('resultMessage');
const historyListEl = document.getElementById('historyList');
const resetBtn = document.getElementById('resetBtn');

function getComputerMove() {
  const keys = Object.keys(moves);
  return keys[Math.floor(Math.random() * keys.length)];
}

function playGame(playerChoice) {
  const computerChoice = getComputerMove();
  const playerMove = moves[playerChoice];
  const computerMove = moves[computerChoice];

  playerMoveEl.textContent = playerMove.icon;
  computerMoveEl.textContent = computerMove.icon;

  let result = '';
  let winner = '';

  if (playerChoice === computerChoice) {
    result = "It's a draw!";
    winner = 'draw';
  } else if (playerMove.beats === computerChoice) {
    result = 'You win! ' + playerMove.name + ' beats ' + computerMove.name;
    winner = 'player';
    playerScore++;
  } else {
    result = 'You lose! ' + computerMove.name + ' beats ' + playerMove.name;
    winner = 'computer';
    computerScore++;
  }

  playerScoreEl.textContent = playerScore;
  computerScoreEl.textContent = computerScore;
  resultMessageEl.textContent = result;

  history.unshift({
    player: playerMove.icon,
    computer: computerMove.icon,
    winner: winner,
    timestamp: new Date().toLocaleTimeString()
  });

  if (history.length > 10) {
    history.pop();
  }

  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyListEl.innerHTML = '<p class="empty-history">No games played yet</p>';
    return;
  }

  let html = '';
  for (const item of history) {
    let resultText = '';
    let resultClass = '';

    if (item.winner === 'player') {
      resultText = '✅ Win';
      resultClass = 'win';
    } else if (item.winner === 'computer') {
      resultText = '❌ Lose';
      resultClass = 'lose';
    } else {
      resultText = '⚖️ Draw';
      resultClass = 'draw';
    }

    html += `<div class="history-item ${resultClass}">
      <span class="history-moves">${item.player} vs ${item.computer}</span>
      <span class="history-result">${resultText}</span>
      <span class="history-time">${item.timestamp}</span>
    </div>`;
  }

  historyListEl.innerHTML = html;
}

function resetScore() {
  playerScore = 0;
  computerScore = 0;
  history.length = 0;

  playerScoreEl.textContent = '0';
  computerScoreEl.textContent = '0';
  playerMoveEl.textContent = '❓';
  computerMoveEl.textContent = '❓';
  resultMessageEl.textContent = 'Choose your move to start';
  renderHistory();
}

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    playGame(this.dataset.move);
  });
});

resetBtn.addEventListener('click', resetScore);

console.log('RPS ready!');
