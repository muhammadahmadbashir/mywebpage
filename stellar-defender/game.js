const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game State
let gameActive = false;
let score = 0;
let difficultyMultiplier = 0.5;
let spawnTimer = 0;
let spawnInterval = 2000; // ms

// Assets
const assets = {
    player: new Image(),
    enemy: new Image(),
    bg: new Image()
};

assets.player.src = 'assets/player.png';
assets.enemy.src = 'assets/enemy.png';
assets.bg.src = 'assets/bg.png';

// Canvas Sizing
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Input Handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Classes
class Player {
    constructor() {
        this.width = 80;
        this.height = 80;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 50; // More spacing from bottom
        this.speed = 600; // px per second
        this.color = '#00f3ff';
        this.lastShotTime = 0;
        this.shootDelay = 250; // ms
    }

    update(deltaTime) {
        if (keys.ArrowLeft && this.x > 0) {
            this.x -= this.speed * deltaTime;
        }
        if (keys.ArrowRight && this.x < canvas.width - this.width) {
            this.x += this.speed * deltaTime;
        }

        // Clamp position to screen bounds (handles resize edge cases)
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width));

        if (keys.Space && Date.now() - this.lastShotTime > this.shootDelay) {
            this.shoot();
            this.lastShotTime = Date.now();
        }
    }

    draw() {
        // Draw engine trail
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        // Draw sprite if loaded, else fallback
        if (assets.player.complete) {
            ctx.drawImage(assets.player, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();
    }

    shoot() {
        bullets.push(new Bullet(this.x + this.width / 2, this.y, -800, this.color)); // Faster bullets
    }
}

class Enemy {
    constructor(x, y, type = 'normal') {
        this.width = 70;
        this.height = 70;
        this.x = x;
        this.y = y;
        this.baseSpeedY = 150; // Base speed pixels per second
        this.speedX = type === 'sine' ? 100 : 0;
        this.type = type;
        this.initialX = x;
        this.markedForDeletion = false;
        this.color = '#ff0055';
        this.time = 0;
    }

    update(deltaTime) {
        // Calculate current speed based on global difficulty
        const currentSpeedY = this.baseSpeedY * difficultyMultiplier;
        this.y += currentSpeedY * deltaTime;
        this.time += deltaTime;

        if (this.type === 'sine') {
            this.x = this.initialX + Math.sin(this.time * 3) * 100;
        }

        // Shooting logic
        if (Math.random() < 0.5 * deltaTime * difficultyMultiplier) {
            enemyBullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, 400, '#ffaa00'));
        }

        if (this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        if (assets.enemy.complete) {
            ctx.drawImage(assets.enemy, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, speed, color) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = speed;
        this.color = color;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        this.y += this.speed * deltaTime;
        if (this.y < -50 || this.y > canvas.height + 50) {
            this.markedForDeletion = true;
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.color = color;
        this.life = 100;
        this.markedForDeletion = false;
    }

    update(deltaTime) {
        this.x += this.speedX * deltaTime * 60; // Adjust for delta time
        this.y += this.speedY * deltaTime * 60;
        this.life -= 200 * deltaTime;
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / 100;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Game Objects
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let bgY = 0;
let lastTime = 0;

function init() {
    player = new Player();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    score = 0;
    spawnTimer = 0;
    difficultyMultiplier = 0.5;
    spawnInterval = 2000;
    scoreEl.innerText = score;
    gameActive = true;
    lastTime = performance.now();
    requestAnimationFrame(animate);
}

function spawnEnemies(deltaTime) {
    spawnTimer += deltaTime * 1000;
    if (spawnTimer > spawnInterval) {
        const x = Math.random() * (canvas.width - 70);
        const type = Math.random() > 0.7 ? 'sine' : 'normal';
        enemies.push(new Enemy(x, -150, type)); // Spawn higher up
        spawnTimer = 0;
    }
}

function checkCollisions() {
    // Player Bullets hitting Enemies
    bullets.forEach(bullet => {
        if (bullet.markedForDeletion) return;

        enemies.forEach(enemy => {
            if (enemy.markedForDeletion || bullet.markedForDeletion) return;

            if (
                bullet.x > enemy.x &&
                bullet.x < enemy.x + enemy.width &&
                bullet.y > enemy.y &&
                bullet.y < enemy.y + enemy.height
            ) {
                // Hit!
                bullet.markedForDeletion = true;
                enemy.markedForDeletion = true;
                score += 1;
                scoreEl.innerText = score;
                updateDifficulty();
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0055');
            }
        });
    });

    // Enemy Bullets hitting Player
    enemyBullets.forEach(bullet => {
        if (
            bullet.x > player.x + 20 && // Hitbox adjustment
            bullet.x < player.x + player.width - 20 &&
            bullet.y > player.y + 20 &&
            bullet.y < player.y + player.height - 20
        ) {
            gameOver();
        }
    });

    // Enemies hitting Player
    enemies.forEach(enemy => {
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            gameOver();
        }
    });
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateDifficulty() {
    // Increase speed every 15 points
    difficultyMultiplier = 0.5 + Math.floor(score / 15) * 0.1;

    // Decrease spawn interval every 20 points
    // Starts at 2000ms, decreases by 100ms, min 500ms
    spawnInterval = Math.max(500, 2000 - Math.floor(score / 20) * 100);
}

function gameOver() {
    gameActive = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
    createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#00f3ff');
}

function drawBackground(deltaTime) {
    if (assets.bg.complete) {
        ctx.drawImage(assets.bg, 0, bgY, canvas.width, canvas.height);
        ctx.drawImage(assets.bg, 0, bgY - canvas.height, canvas.width, canvas.height);
        bgY += 100 * deltaTime; // Speed based on time
        if (bgY >= canvas.height) bgY = 0;
    } else {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function animate(timeStamp) {
    if (!gameActive) return;

    // Cap deltaTime to 0.1s (100ms) to prevent huge jumps if tab is inactive
    let deltaTime = (timeStamp - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;

    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(deltaTime);

    // Update & Draw Player
    player.update(deltaTime);
    player.draw();

    // Update & Draw Bullets
    bullets.forEach(bullet => {
        bullet.update(deltaTime);
        bullet.draw();
    });
    bullets = bullets.filter(b => !b.markedForDeletion);

    enemyBullets.forEach(bullet => {
        bullet.update(deltaTime);
        bullet.draw();
    });
    enemyBullets = enemyBullets.filter(b => !b.markedForDeletion);

    // Update & Draw Enemies
    enemies.forEach(enemy => {
        enemy.update(deltaTime);
        enemy.draw();
    });
    enemies = enemies.filter(e => !e.markedForDeletion);

    // Update & Draw Particles
    particles.forEach(particle => {
        particle.update(deltaTime);
        particle.draw();
    });
    particles = particles.filter(p => !p.markedForDeletion);

    spawnEnemies(deltaTime);
    checkCollisions();

    requestAnimationFrame(animate);
}

// Event Listeners
startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    startBtn.blur(); // Remove focus so Spacebar doesn't trigger this again
    init();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    restartBtn.blur();
    init();
});

// Prevent default spacebar scrolling/interaction
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
    }
});
