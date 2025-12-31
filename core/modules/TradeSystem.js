class TradeSystem {
  constructor(bot) {
    this.bot = bot;
    this.pendingOffers = new Map(); // { from: offer }
  }

  onChatMessage(msg) {
    const match = msg.match(/Торгую (\d+) ([^\s]+) на (\d+) ([^\s]+)/);
    if (match) {
      const [, count1, item1, count2, item2] = match;
      const sender = msg.split('>')[0]?.replace('<', '') || 'unknown';
      console.log(`${this.bot.username}: 💰 Получено предложение от ${sender}: ${count1} ${item1} ↔ ${count2} ${item2}`);
      // Простая логика: принимаем, если у нас есть item2
      if (Math.random() < 0.6) {
        this.bot.sendChat(`Принимаю! Отправляю ${count2} ${item2}`);
        this.executeTrade(sender, item1, count1, item2, count2);
      }
    }
  }

  executeTrade(partner, giveItem, giveCount, receiveItem, receiveCount) {
    console.log(`${this.bot.username}: 🤝 Обмен с ${partner}: отдаю ${giveCount} ${giveItem}, получаю ${receiveCount} ${receiveItem}`);
    // В реальности — window_click, но пока симуляция
  }

  proposeTrade(partner, giveItem, giveCount, receiveItem, receiveCount) {
    this.bot.sendChat(`Торгую ${giveCount} ${giveItem} на ${receiveCount} ${receiveItem}`);
  }
}

module.exports = TradeSystem;
