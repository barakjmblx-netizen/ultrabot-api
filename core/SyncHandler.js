class SyncHandler {
  constructor(bot) {
    this.bot = bot;
    this.movement = bot.movement;
  }

  onOwnerAction(action) {
    if (!action || typeof action !== 'object') return;

    switch (action.type) {
      case 'move':
        // Управление передвижением
        ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak'].forEach(control => {
          if (action.hasOwnProperty(control)) {
            this.movement.setControl(control, !!action[control]);
          }
        });
        // Поворот головы
        if (action.yaw !== undefined || action.pitch !== undefined) {
          this.movement.look(action.yaw || 0, action.pitch || 0);
        }
        break;

      case 'attack':
        this.movement.swingArm();
        break;

      case 'break':
        this.movement.startBreaking(action.power || 1, action.speed || 20);
        break;

      case 'position':
        if (action.x !== undefined) {
          this.movement.sendPosition(action.x, action.y, action.z, action.onGround);
        }
        break;

      default:
        console.warn(`⚠️ [${this.bot.username}] Неизвестная команда: ${action.type}`);
    }
  }
}

module.exports = SyncHandler;
