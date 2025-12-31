/**
 * Готовый профиль ИИ для выживания
 * Включает: поиск еды, строительство, избегание опасностей
 */

class SurvivalAI {
  constructor(bot) {
    this.bot = bot;
  }

  enable() {
    console.log(`🧠 [${this.bot.username}] Включён профиль SurvivalAI`);
    
    // Убедимся, что все системы активны
    if (!this.bot.behavior) {
      const BehaviorController = require('../BehaviorController');
      this.bot.behavior = new BehaviorController(this.bot);
      this.bot.behavior.start();
    }
    
    if (!this.bot.crafting) {
      const CraftingSystem = require('../CraftingSystem');
      this.bot.crafting = new CraftingSystem(this.bot);
      this.bot.crafting.start();
    }
    
    // Включаем навигацию
    if (!this.bot.modules.navigator) {
      const ChunkNavigator = require('../modules/ChunkNavigator');
      this.bot.modules.navigator = new ChunkNavigator(this.bot);
    }
    
    // Настройка целей
    this.bot.world.goals = ['find_food', 'build_shelter', 'avoid_hostile'];
    
    // Настройка страхов
    this.bot.world.dangerousMobs.forEach(mob => this.bot.world.fear(mob));
    
    this.bot.sendChat('🟢 SurvivalAI активирован!');
  }
}

module.exports = SurvivalAI;
