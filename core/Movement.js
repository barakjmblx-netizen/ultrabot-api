const { Vec3 } = require('vec3');

class Movement {
  constructor(bot) {
    this.bot = bot;
    this.client = bot.client;
    this.controls = { forward: 0, sideways: 0 };
    this.breaking = false;
    this.attacking = false;
  }

  setControl(action, state) {
    if (!this.client || this.client.state !== 'PLAY') return;
    switch (action) {
      case 'forward': this.controls.forward = state ? 1 : 0; break;
      case 'back': this.controls.forward = state ? -1 : 0; break;
      case 'left': this.controls.sideways = state ? -1 : 0; break;
      case 'right': this.controls.sideways = state ? 1 : 0; break;
      case 'jump':
        if (state) this.client.write('entity_action', { entityId: this.client.entityId, actionId: 4, jumpBoost: 100 });
        break;
      case 'sprint':
        this.client.write('entity_action', { entityId: this.client.entityId, actionId: state ? 3 : 5, jumpBoost: 0 });
        break;
    }
    this.client.write('steer_vehicle', { sideways: this.controls.sideways, forward: this.controls.forward, flags: 0 });
  }

  swingArm() {
    if (this.client?.state === 'PLAY') this.client.write('arm_animation', { hand: 0 });
  }

  startBreaking(power, speed) {
    if (this.breaking) return;
    this.breaking = true;
    const loop = () => {
      if (!this.breaking || !this.client || this.client.state !== 'PLAY') return;
      this.swingArm();
      setTimeout(loop, 1000 / speed);
    };
    loop();
  }

  startAttacking(power, speed) {
    if (this.attacking) return;
    this.attacking = true;
    const loop = () => {
      if (!this.attacking || !this.client || this.client.state !== 'PLAY') return;
      this.swingArm();
      setTimeout(loop, 1000 / speed);
    };
    loop();
  }

  stopAll() {
    this.breaking = false;
    this.attacking = false;
    ['forward', 'back', 'left', 'right', 'sprint'].forEach(a => this.setControl(a, false));
  }
}
module.exports = Movement;