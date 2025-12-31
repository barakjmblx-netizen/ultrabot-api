const ChunkNavigator = require('./modules/ChunkNavigator');

class BehaviorController {
  constructor(bot) {
    this.bot = bot;
    this.world = bot.world;
    this.navigator = null;
    this.active = false;
    this.currentTask = null;
    this.taskInterval = null;
  }

  start() {
    this.active = true;
    this.navigator = new ChunkNavigator(this.bot);
    console.log(`🧠 [${this.bot.username}] BehaviorController запущен.`);
    this.thinkLoop();
  }

  thinkLoop() {
    if (!this.active) return;
    this.makeDecision();
    this.taskInterval = setTimeout(() => this.thinkLoop(), 2000);
  }

  makeDecision() {
    // Проверка здоровья
    if (this.world.health < 10) {
      this.fleeFromDanger();
      return;
    }

    // Проверка голода
    if (this.world.needsFood()) {
      this.findFood();
      return;
    }

    // Случайные действия
    if (Math.random() < 0.05) {
      this.explore();
    }

    // Социальные действия
    this.handleSocialInteractions();
  }

  findFood() {
    this.bot.sendChat('🔍 Ищу еду...');
    // Идти к ближайшему животному или растению
    const target = { x: this.world.position.x + 10, y: this.world.position.y, z: this.world.position.z };
    this.navigateTo(target);
  }

  fleeFromDanger() {
    this.bot.sendChat('🏃 Бегу от опасности!');
    // Бежать в противоположную сторону от последней угрозы
    this.movement.setControl('sprint', true);
    this.movement.setControl('back', true);
    setTimeout(() => {
      this.movement.setControl('sprint', false);
      this.movement.setControl('back', false);
    }, 3000);
  }

  explore() {
    const direction = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * 20;
    const target = {
      x: this.world.position.x + Math.cos(direction) * distance,
      y: this.world.position.y,
      z: this.world.position.z + Math.sin(direction) * distance
    };
    this.navigateTo(target);
  }

  navigateTo(target) {
    if (!this.navigator) return;
    const path = this.navigator.findPath(this.world.position, target);
    if (path && path.length > 0) {
      this.navigator.moveAlongPath(path);
      this.currentTask = 'navigation';
    }
  }

  buildStructure(size) {
    this.bot.sendChat(`🏗️ Строю структуру ${size}x${size}...`);
    // В полной версии — размещение блоков через set_block
    this.currentTask = 'building';
  }

  moveToTarget(distance, direction) {
    // direction: 0=forward, 1=right, 2=back, 3=left
    const dirs = ['forward', 'right', 'back', 'left'];
    const dir = dirs[direction % 4] || 'forward';
    this.bot.movement.setControl(dir, true);
    setTimeout(() => this.bot.movement.setControl(dir, false), distance * 100);
    this.currentTask = 'moving';
  }

  handleSocialInteractions() {
    // Пример: если есть союзник рядом — защищать его
    for (const [player, rel] of Object.entries(this.world.relationships)) {
      if (rel.alliance && Math.random() < 0.1) {
        this.bot.sendChat(`🛡️ Защищаю ${player}!`);
      }
    }
  }

  onChatMessage(msg) {
    // Реакция на чат
    if (msg.includes('help') || msg.includes('помоги')) {
      this.bot.sendChat('🤖 Готов помочь!');
    }
  }

  onDisconnect() {
    this.active = false;
    if (this.taskInterval) clearTimeout(this.taskInterval);
    this.currentTask = null;
  }

  stopCurrentTask() {
    if (this.currentTask) {
      console.log(`🛑 [${this.bot.username}] Остановлена задача: ${this.currentTask}`);
      this.currentTask = null;
      if (this.navigator) this.navigator.stop();
    }
  }
}

module.exports = BehaviorController;
