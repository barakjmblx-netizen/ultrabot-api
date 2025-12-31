class SwarmMemory {
  constructor(bot) {
    this.bot = bot;
    this.knowledgeMap = new Map(); // { type: [{x,y,z,info}] }
    this.players = new Set();
  }

  start() {
    if (this.bot.config.swarm?.enabled) {
      console.log(`🧠 [${this.bot.username}] SwarmMemory активирован`);
    }
  }

  // Обмен знаниями
  shareKnowledge(type, data) {
    if (!this.bot.config.swarm?.shareKnowledge) return;
    this.knowledgeMap.set(type, data);
    this.broadcastKnowledge(type, data);
  }

  broadcastKnowledge(type, data) {
    // В реальности — через внутренний протокол (не чат)
    this.bot.sendChat(`[SWARM] ${type}: ${JSON.stringify(data)}`);
  }

  onPlayerList(data) {
    // Обновление списка игроков
    // data — пакет player_list_item
  }

  // Пример: бот нашёл алмазы
  onFindOre(x, y, z) {
    this.shareKnowledge('diamond_ore', { x, y, z, timestamp: Date.now() });
  }
}
module.exports = SwarmMemory;