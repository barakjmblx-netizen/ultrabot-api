class BehaviorController {
  constructor(bot) { this.bot = bot; }
  start() { setInterval(() => this.decide(), 3000); }
  decide() {
    // Пример: запрос стратегии через LLM
    const llm = require('./external_api/LLMStrategy');
    new llm().getStrategy('Как выжить в Нижнем мире с 10 HP?').then(strat => {
      if (strat) console.log(`💡 Стратегия: ${strat}`);
    });
  }
  onChat(msg) {}
  onExternalAction(cmd) {
    if (cmd.type === 'move') {
      // Движение через адаптер
    }
  }
}
module.exports = BehaviorController;