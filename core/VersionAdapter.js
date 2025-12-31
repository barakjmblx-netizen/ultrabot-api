class VersionAdapter {
  constructor(version) {
    this.version = version;
    this.mcData = require('minecraft-data')(version);
    this.useChatCommand = this.isNewVersion(version);
  }

  isNewVersion(v) {
    const ver = parseFloat(v);
    return ver >= 1.19;
  }

  adaptPacket(name, data) {
    // Могут быть версии, где пакеты отличаются
    // Пока возвращаем как есть, но можно добавить логику
    return data;
  }
}
module.exports = VersionAdapter;