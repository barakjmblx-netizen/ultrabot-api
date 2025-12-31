class SyncHandler {
  constructor(bot) { this.bot = bot; }
  onAction(action) {
    if (action.type === 'move') {
      ['forward', 'back', 'left', 'right', 'sprint'].forEach(k => {
        if (action[k] !== undefined) this.bot.movement.setControl(k, action[k]);
      });
    } else if (action.type === 'attack') {
      this.bot.movement.swingArm();
    }
  }
}
module.exports = SyncHandler;