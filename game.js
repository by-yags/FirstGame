// Basic Phaser 3 game configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        create: create,
        update: update
    },
    backgroundColor: '#000000'
};

const game = new Phaser.Game(config);

// Game state variables
let player;
let weapon;
let isAttacking = false;
let enemies;
let powerups;
let spawnTimer;

// Player and level stats
let coreHealth = 100;
let healthText;
let score = 0;
let scoreText;
let level = 1;
let levelText;
let killsToNextLevel = 10;
const baseSpawnDelay = 2000;

function create() {
    const screenCenterX = this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.height / 2;

    // --- Player and Weapon Setup ---
    let playerGraphic = this.add.graphics();
    playerGraphic.fillStyle(0xffffff, 1);
    playerGraphic.fillCircle(16, 16, 16);
    playerGraphic.generateTexture('playerTexture', 32, 32);
    playerGraphic.destroy();
    player = this.physics.add.sprite(screenCenterX, screenCenterY, 'playerTexture').setImmovable(true);
    weapon = this.add.graphics({ x: player.x, y: player.y });

    // --- Texture Setup ---
    createAllTextures(this);

    // --- Group Setup ---
    enemies = this.physics.add.group();
    powerups = this.physics.add.group();

    spawnTimer = this.time.addEvent({
        delay: baseSpawnDelay,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    // --- UI Setup ---
    healthText = this.add.text(16, 16, 'Core Health: 100', { fontSize: '24px', fill: '#fff', fontFamily: 'Arial' });
    levelText = this.add.text(16, 50, 'Level: 1', { fontSize: '24px', fill: '#fff', fontFamily: 'Arial' });
    scoreText = this.add.text(this.cameras.main.width - 16, 16, 'Score: 0', { fontSize: '24px', fill: '#fff', fontFamily: 'Arial' }).setOrigin(1, 0);

    // --- Collision & Attack ---
    this.physics.add.collider(player, enemies, enemyHitCore, null, this);
    this.input.on('pointerdown', () => {
        if (isAttacking || coreHealth <= 0) return;
        isAttacking = true;

        const attackAngle = weapon.rotation;
        const attackRadius = 90;
        const attackArc = Math.PI / 2;

        let attackVisual = this.add.graphics({ x: player.x, y: player.y });
        attackVisual.lineStyle(6, 0xffff00);
        attackVisual.beginPath();
        attackVisual.arc(0, 0, attackRadius, attackAngle - attackArc / 2, attackAngle + attackArc / 2);
        attackVisual.strokePath();

        // Check for enemy hits
        enemies.getChildren().forEach(enemy => {
            const angleBetween = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
            const angleDiff = Phaser.Math.Angle.Wrap(angleBetween - attackAngle);

            if (distance < attackRadius && Math.abs(angleDiff) < attackArc / 2) {
                dropPowerup(enemy.x, enemy.y, this);
                enemy.destroy();
                updateScore(10, this);
            }
        });

        // Check for powerup collection
        powerups.getChildren().forEach(powerup => {
            const distance = Phaser.Math.Distance.Between(player.x, player.y, powerup.x, powerup.y);
            if (distance < attackRadius) {
                collectPowerup.call(this, player, powerup);
            }
        });

        this.time.delayedCall(150, () => {
            isAttacking = false;
            attackVisual.destroy();
        });
    });
}

function update() {
    if (coreHealth <= 0) return;

    if (!isAttacking) {
        const pointer = this.input.activePointer;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.worldX, pointer.worldY);
        weapon.rotation = angle;
    }
    weapon.clear();
    weapon.lineStyle(4, 0xffffff);
    weapon.lineBetween(0, 0, 60, 0);

    scoreText.x = this.cameras.main.width - 16;
}

function createAllTextures(scene) {
    // Doubt Specter
    let doubtEnemyGraphic = scene.add.graphics();
    doubtEnemyGraphic.fillStyle(0xcc_aaff, 0.8);
    doubtEnemyGraphic.fillTriangle(0, 16, 8, 0, 16, 16);
    doubtEnemyGraphic.generateTexture('doubtEnemyTexture', 16, 16);
    doubtEnemyGraphic.destroy();
    // Fear Specter
    let fearEnemyGraphic = scene.add.graphics();
    fearEnemyGraphic.fillStyle(0x440000, 0.9);
    fearEnemyGraphic.slice(8, 8, 10, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(330));
    fearEnemyGraphic.fillPath();
    fearEnemyGraphic.fillStyle(0xff0000, 1);
    fearEnemyGraphic.fillCircle(8, 8, 2);
    fearEnemyGraphic.generateTexture('fearEnemyTexture', 16, 16);
    fearEnemyGraphic.destroy();
    // Catharsis Powerup
    let catharsisGraphic = scene.add.graphics();
    catharsisGraphic.fillStyle(0x00ff00, 1);
    catharsisGraphic.fillCircle(10, 10, 10);
    catharsisGraphic.lineStyle(2, 0xffffff, 1);
    catharsisGraphic.strokeCircle(10, 10, 10);
    catharsisGraphic.generateTexture('catharsisPowerup', 20, 20);
    catharsisGraphic.destroy();
}

function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    let x, y;

    switch (edge) {
        case 0: x = Phaser.Math.Between(0, width); y = -20; break;
        case 1: x = width + 20; y = Phaser.Math.Between(0, height); break;
        case 2: x = Phaser.Math.Between(0, width); y = height + 20; break;
        case 3: x = -20; y = Phaser.Math.Between(0, height); break;
    }

    let enemy;
    let speed;

    if (level >= 2 && Math.random() < 0.3) {
        enemy = enemies.create(x, y, 'fearEnemyTexture');
        speed = 150 + (level * 8);
        this.physics.moveToObject(enemy, player, speed);
    } else {
        enemy = enemies.create(x, y, 'doubtEnemyTexture');
        speed = 100 + (level * 5);
        this.physics.moveToObject(enemy, player, speed);

        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (enemy.active) {
                    const randX = (Math.random() - 0.5) * 100;
                    const randY = (Math.random() - 0.5) * 100;
                    enemy.body.velocity.x += randX;
                    enemy.body.velocity.y += randY;
                    enemy.body.velocity.normalize().scale(speed);
                }
            },
            loop: true
        });
    }
}

function enemyHitCore(player, enemy) {
    if (coreHealth <= 0) return;
    dropPowerup(enemy.x, enemy.y, this);
    enemy.destroy();
    coreHealth -= 10;
    healthText.setText('Core Health: ' + coreHealth);
    this.cameras.main.shake(100, 0.01);
    this.cameras.main.flash(100, 255, 0, 0);
    if (coreHealth <= 0) {
        gameOver.call(this);
    }
}

function gameOver() {
    this.physics.pause();
    spawnTimer.remove();
    player.setTint(0xff0000);
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'GAME OVER', {
        fontSize: '64px', fill: '#ff0000', fontFamily: 'Arial'
    }).setOrigin(0.5);
}

function updateScore(points, scene) {
    score += points;
    scoreText.setText('Score: ' + score);
    killsToNextLevel--;
    if (killsToNextLevel <= 0) {
        levelUp.call(scene);
    }
}

function levelUp() {
    level++;
    levelText.setText('Level: ' + level);
    killsToNextLevel = 10 + (level * 2);

    let newDelay = baseSpawnDelay - (level * 100);
    spawnTimer.delay = Math.max(newDelay, 500);

    coreHealth = Math.min(100, coreHealth + 20);
    healthText.setText('Core Health: ' + coreHealth);

    this.cameras.main.flash(200, 100, 255, 255);
    levelText.setFontSize(32);
    this.time.delayedCall(300, () => {
        levelText.setFontSize(24);
    });
}

function dropPowerup(x, y, scene) {
    if (Math.random() < 0.1) { // 10% chance
        const powerup = powerups.create(x, y, 'catharsisPowerup');
        powerup.body.setAllowGravity(false);
        powerup.body.velocity.x = (Math.random() - 0.5) * 20;
        powerup.body.velocity.y = (Math.random() - 0.5) * 20;
    }
}

function collectPowerup(player, powerup) {
    powerup.destroy();

    // Catharsis effect: destroy all enemies
    let flash = this.add.graphics({ x: player.x, y: player.y });
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(0, 0, 10);
    this.tweens.add({
        targets: flash,
        scale: { from: 1, to: 40 },
        alpha: { from: 1, to: 0 },
        duration: 400,
        onComplete: () => flash.destroy()
    });

    enemies.getChildren().forEach(enemy => {
        enemy.destroy();
        updateScore(10, this);
    });
}
