const { Vec3 } = require('vec3');

class Movement {
  constructor(bot) {
    this.bot = bot;
    this.client = bot.client;
    this.activeControls = {
      forward: false,
      back: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      sneak: false
    };
    this.breaking = false;
    this.attacking = false;
    this.swimming = false;
    this.lastSentPosition = null;
    this.positionUpdateInterval = null;
  }

  setControl(control, state) {
    if (!this.client || this.client.state !== 'PLAY') return;
    this.activeControls[control] = !!state;

    // Обновляем steer_vehicle
    const forward = (this.activeControls.forward ? 1 : 0) - (this.activeControls.back ? 1 : 0);
    const sideways = (this.activeControls.right ? 1 : 0) - (this.activeControls.left ? 1 : 0);
    const flags = (this.activeControls.jump ? 1 : 0);

    this.client.write('steer_vehicle', {
      sideways: sideways,
      forward: forward,
      flags: flags
    });

    // Обработка sprint/sneak через entity_action
    if (control === 'sprint') {
      const actionId = state ? 3 : 5; // start_sprint / stop_sprint
      this.client.write('entity_action', {
        entityId: this.client.entityId,
        actionId: actionId,
        jumpBoost: 0
      });
    }

    if (control === 'sneak') {
      const actionId = state ? 0 : 1; // start_sneak / stop_sneak
      this.client.write('entity_action', {
        entityId: this.client.entityId,
        actionId: actionId,
        jumpBoost: 0
      });
    }
  }

  look(yaw, pitch) {
    if (!this.client || this.client.state !== 'PLAY') return;
    this.client.write('player_look', {
      yaw: yaw,
      pitch: pitch
    });
  }

  swingArm() {
    if (!this.client || this.client.state !== 'PLAY') return;
    this.client.write('arm_animation', { hand: 0 });
  }

  // === АТАКА ===
  startAttacking(power = 1, speed = 10) {
    if (this.attacking) return;
    this.attacking = true;
    console.log(`⚔️ [${this.bot.username}] Начинаю атаку (сила=${power}, скорость=${speed})`);

    const attackLoop = () => {
      if (!this.attacking || !this.client || this.client.state !== 'PLAY') return;
      this.swingArm();
      setTimeout(attackLoop, 1000 / speed);
    };
    attackLoop();
  }

  // === ДОБЫЧА ===
  startBreaking(power = 1, speed = 20) {
    if (this.breaking) return;
    this.breaking = true;
    console.log(`⛏️ [${this.bot.username}] Начинаю добычу (сила=${power}, скорость=${speed})`);

    const breakLoop = () => {
      if (!this.breaking || !this.client || this.client.state !== 'PLAY') return;
      this.swingArm();
      setTimeout(breakLoop, 1000 / speed);
    };
    breakLoop();
  }

  // === ПЛАВАНИЕ ===
  enableSwimming() {
    this.swimming = true;
    if (!this.client || this.client.state !== 'PLAY') return;
    // Для версий 1.8+
    if (this.bot.version && this.bot.version >= '1.8') {
      this.client.write('entity_action', {
        entityId: this.client.entityId,
        actionId: 7, // start swim
        jumpBoost: 0
      });
    }
  }

  // === ОСТАНОВКА ВСЕХ ДЕЙСТВИЙ ===
  stopAll() {
    this.breaking = false;
    this.attacking = false;
    this.swimming = false;

    // Сброс всех контролов
    Object.keys(this.activeControls).forEach(control => {
      this.setControl(control, false);
    });

    console.log(`🛑 [${this.bot.username}] Все движения остановлены.`);
  }

  // === ОТПРАВКА ПОЗИЦИИ (для pathfinding) ===
  sendPosition(x, y, z, onGround = true) {
    if (!this.client || this.client.state !== 'PLAY') return;
    this.client.write('position_look', {
      x: x,
      y: y,
      z: z,
      yaw: 0,
      pitch: 0,
      onGround: onGround
    });
    this.lastSentPosition = new Vec3(x, y, z);
  }

  // === ПРЫЖОК ===
  jump() {
    this.setControl('jump', true);
    setTimeout(() => this.setControl('jump', false), 250);
  }
}

module.exports = Movement;
