const mc = require('minecraft-protocol');

class VersionAdapter {
  constructor(version) {
    this.version = version;
    this.isLegacy = this.compareVersion(version, '1.12.2') <= 0;
    this.isModern = this.compareVersion(version, '1.19') >= 0;
    this.isLatest = this.compareVersion(version, '1.21') >= 0;
  }

  compareVersion(v1, v2) {
    const a = v1.replace('1.', '').split('.').map(Number);
    const b = v2.replace('1.', '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const n1 = a[i] || 0;
      const n2 = b[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  createClient(opts) {
    return mc.createClient(opts);
  }

  sendChat(client, message) {
    if (!client || client.state !== 'PLAY') return;
    if (this.isModern) {
      // 1.19+: используем chat_command, если это команда
      if (message.startsWith('/')) {
        client.write('chat_command', { command: message.slice(1), timestamp: BigInt(Date.now() * 1000000) });
      } else {
        client.write('chat', { message, timestamp: BigInt(Date.now() * 1000000) });
      }
    } else {
      client.write('chat', { message });
    }
  }

  sendJump(client) {
    if (!client) return;
    if (this.isLegacy) {
      client.write('entity_action', { entityId: client.entityId, actionId: 4, jumpBoost: 100 });
    } else {
      client.write('player_command', { entityId: client.entityId, actionId: 4, jumpBoost: 100 });
    }
  }
}
module.exports = VersionAdapter;