// Game configuration
const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 700,
  DROP_RADIUS: 30,
  BASE_FALL_SPEED: 0.5,
  SPEED_INCREASE_RATE: 0.05,
  MAX_SPEED: 2.5,
  DROP_SPAWN_INTERVAL: 2500,
  MIN_SPAWN_INTERVAL: 1000,
  SPAWN_DECREASE_RATE: 100,
  WRONG_ANSWER_COOLDOWN: 1500,
  MAX_CORRECT: 25,
  MAX_WRONG: 3,
};

// Game state
const gameState = {
  drops: [],
  correctAnswers: 0,
  wrongAnswers: 0,
  gameSpeed: 1,
  isGameOver: false,
  isGameStarted: false,
  lastSpawnTime: 0,
  currentSpawnInterval: CONFIG.DROP_SPAWN_INTERVAL,
  cooldownActive: false,
  cooldownEndTime: 0,
  currentTimestamp: 0,
};

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound effect generator
function playCorrectSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Pleasant ascending tone
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

  oscillator.type = "sine";
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.3
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

function playWrongSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Descending "wrong" tone
  oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4
  oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.15); // G3

  oscillator.type = "square";
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.25
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.25);
}

// Math equation generator
class EquationGenerator {
  static generate() {
    const types = ["add", "subtract", "multiply", "divide"];
    const type = types[Math.floor(Math.random() * types.length)];

    let num1, num2, answer, equation;

    switch (type) {
      case "add":
        num1 = Math.floor(Math.random() * 51);
        num2 = Math.floor(Math.random() * 51);
        answer = num1 + num2;
        equation = `${num1} + ${num2}`;
        break;

      case "subtract":
        num1 = Math.floor(Math.random() * 51);
        num2 = Math.floor(Math.random() * 51);
        // Ensure positive result
        if (num1 < num2) [num1, num2] = [num2, num1];
        answer = num1 - num2;
        equation = `${num1} - ${num2}`;
        break;

      case "multiply":
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        equation = `${num1} × ${num2}`;
        break;

      case "divide":
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = Math.floor(Math.random() * 12) + 1;
        num1 = num2 * answer;
        equation = `${num1} ÷ ${num2}`;
        break;
    }

    return { equation, answer };
  }
}

// Water Drop class
class WaterDrop {
  constructor(x, y, equation, answer) {
    this.x = x;
    this.y = y;
    this.equation = equation;
    this.answer = answer;
    this.radius = CONFIG.DROP_RADIUS;
    this.speed = CONFIG.BASE_FALL_SPEED;
  }

  update(speedMultiplier) {
    this.y += this.speed * speedMultiplier;
  }

  draw(ctx) {
    // Draw water drop shape
    ctx.save();

    // Drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    // Create teardrop shape
    ctx.beginPath();

    // Start at the bottom point of the teardrop
    ctx.moveTo(this.x, this.y + this.radius);

    // Left curve
    ctx.bezierCurveTo(
      this.x - this.radius * 1.3,
      this.y + this.radius * 0.3,
      this.x - this.radius * 1.1,
      this.y - this.radius * 0.5,
      this.x,
      this.y - this.radius
    );

    // Right curve
    ctx.bezierCurveTo(
      this.x + this.radius * 1.1,
      this.y - this.radius * 0.5,
      this.x + this.radius * 1.3,
      this.y + this.radius * 0.3,
      this.x,
      this.y + this.radius
    );

    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.2,
      0,
      this.x,
      this.y,
      this.radius * 1.3
    );
    gradient.addColorStop(0, "rgba(150, 220, 255, 0.95)");
    gradient.addColorStop(0.5, "rgba(100, 200, 255, 0.85)");
    gradient.addColorStop(1, "rgba(50, 150, 255, 0.75)");

    ctx.fillStyle = gradient;
    ctx.fill();

    // Drop outline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add highlight for glossy effect
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fill();

    ctx.restore();

    // Draw equation text
    ctx.save();
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText(this.equation, this.x, this.y + this.radius * 0.1);
    ctx.restore();
  }

  isOffScreen() {
    return this.y - this.radius > CONFIG.CANVAS_HEIGHT;
  }
}

// Spawn a new drop
function spawnDrop() {
  const { equation, answer } = EquationGenerator.generate();
  // Teardrop extends 1.3x radius on each side, plus some padding for text
  const margin = CONFIG.DROP_RADIUS * 1.5;
  const x = margin + Math.random() * (CONFIG.CANVAS_WIDTH - margin * 2);
  const y = -CONFIG.DROP_RADIUS * 1.5;
  const drop = new WaterDrop(x, y, equation, answer);
  gameState.drops.push(drop);
}

// Update game
function update(timestamp) {
  if (gameState.isGameOver || !gameState.isGameStarted) return;

  // Check if cooldown has ended
  if (gameState.cooldownActive && timestamp >= gameState.cooldownEndTime) {
    gameState.cooldownActive = false;
    document.getElementById("answerInput").disabled = false;
    document.getElementById("answerInput").focus();
  }

  // Don't spawn or update drops during cooldown
  if (gameState.cooldownActive) return;

  // Spawn new drops
  if (timestamp - gameState.lastSpawnTime > gameState.currentSpawnInterval) {
    spawnDrop();
    gameState.lastSpawnTime = timestamp;
  }

  // Update all drops
  gameState.drops.forEach((drop) => {
    drop.update(gameState.gameSpeed);
  });

  // Check for drops that fell off screen (count as wrong answer)
  const hasOffScreenDrops = gameState.drops.some((drop) => drop.isOffScreen());
  if (hasOffScreenDrops) {
    // Any drop that falls off counts as a wrong answer
    // handleWrongAnswer() will clear all drops automatically
    handleWrongAnswer(timestamp);
  }
}

// Render game
function render() {
  // Clear canvas
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Draw all drops
  gameState.drops.forEach((drop) => {
    drop.draw(ctx);
  });
}

// Game loop
function gameLoop(timestamp) {
  gameState.currentTimestamp = timestamp;
  update(timestamp);
  render();
  requestAnimationFrame(gameLoop);
}

// Check answer
function checkAnswer(userAnswer, timestamp) {
  if (gameState.isGameOver || gameState.cooldownActive) return;

  const answer = parseInt(userAnswer);
  if (isNaN(answer)) return;

  let foundCorrect = false;
  let matchCount = 0;

  // Check against all drops and remove ALL matching answers
  for (let i = gameState.drops.length - 1; i >= 0; i--) {
    if (gameState.drops[i].answer === answer) {
      foundCorrect = true;
      gameState.drops.splice(i, 1);
      matchCount++;
    }
  }

  if (foundCorrect) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer(timestamp);
  }

  // Clear input
  document.getElementById("answerInput").value = "";
}

// Handle correct answer
function handleCorrectAnswer() {
  gameState.correctAnswers++;
  updateStats();

  // Play success sound
  playCorrectSound();

  // Increase speed every correct answer, capped at MAX_SPEED
  gameState.gameSpeed = Math.min(
    gameState.gameSpeed + CONFIG.SPEED_INCREASE_RATE,
    CONFIG.MAX_SPEED
  );

  // Decrease spawn interval (faster spawning)
  gameState.currentSpawnInterval = Math.max(
    CONFIG.MIN_SPAWN_INTERVAL,
    gameState.currentSpawnInterval - CONFIG.SPAWN_DECREASE_RATE
  );

  // Check win condition
  if (gameState.correctAnswers >= CONFIG.MAX_CORRECT) {
    endGame(true);
  }
}

// Handle wrong answer
function handleWrongAnswer(timestamp) {
  gameState.wrongAnswers++;
  updateStats();

  // Play wrong sound
  playWrongSound();

  // Clear all drops
  gameState.drops = [];

  // Activate cooldown
  gameState.cooldownActive = true;
  gameState.cooldownEndTime = timestamp + CONFIG.WRONG_ANSWER_COOLDOWN;

  // Disable input during cooldown
  const inputElement = document.getElementById("answerInput");
  inputElement.disabled = true;
  inputElement.value = "";

  // Check lose condition
  if (gameState.wrongAnswers >= CONFIG.MAX_WRONG) {
    endGame(false);
  }
}

// Update stats display
function updateStats() {
  document.getElementById("correctCount").textContent =
    gameState.correctAnswers;
  document.getElementById("wrongCount").textContent = gameState.wrongAnswers;
  document.getElementById("speedLevel").textContent =
    gameState.gameSpeed.toFixed(1) + "x";
}

// End game
function endGame(won) {
  gameState.isGameOver = true;
  const gameOverDiv = document.getElementById("gameOver");
  const titleElement = document.getElementById("gameOverTitle");
  const messageElement = document.getElementById("gameOverMessage");

  if (won) {
    titleElement.textContent = "🎉 Victory! 🎉";
    messageElement.textContent = `Congratulations! You answered ${gameState.correctAnswers} questions correctly!`;
  } else {
    titleElement.textContent = "💧 Game Over 💧";
    messageElement.textContent = `You got ${gameState.correctAnswers} correct answers before ${gameState.wrongAnswers} mistakes.`;
  }

  gameOverDiv.classList.add("show");
}

// Start game
function startGame() {
  // Hide description and start button
  document.querySelector(".description").classList.add("hidden");

  // Enable input
  const inputElement = document.getElementById("answerInput");
  inputElement.disabled = false;
  inputElement.focus();

  // Start the game
  gameState.isGameStarted = true;
  gameState.lastSpawnTime = gameState.currentTimestamp;
}

// Restart game
function restartGame() {
  // Reset game state
  gameState.drops = [];
  gameState.correctAnswers = 0;
  gameState.wrongAnswers = 0;
  gameState.gameSpeed = 1;
  gameState.isGameOver = false;
  gameState.isGameStarted = false;
  gameState.lastSpawnTime = 0;
  gameState.currentSpawnInterval = CONFIG.DROP_SPAWN_INTERVAL;
  gameState.cooldownActive = false;
  gameState.cooldownEndTime = 0;

  // Update display
  updateStats();
  document.getElementById("gameOver").classList.remove("show");

  // Show description and start button again
  const description = document.querySelector(".description");
  description.classList.remove("hidden");

  const inputElement = document.getElementById("answerInput");
  inputElement.value = "";
  inputElement.disabled = true;
}

// Input handling
document.getElementById("answerInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    checkAnswer(e.target.value, gameState.currentTimestamp);
  }
});

// Maintain focus on input
document.addEventListener("click", () => {
  if (!gameState.isGameOver && !gameState.cooldownActive) {
    document.getElementById("answerInput").focus();
  }
});

// Initialize game
updateStats();
requestAnimationFrame(gameLoop);
