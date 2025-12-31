const mcData = require('minecraft-data');

class CraftingSystem {
  constructor(bot) {
    this.bot = bot;
    this.version = bot.version;
    this.mcData = mcData(this.version);
    this.active = false;
  }

  start() {
    this.active = true;
    console.log(`🔨 [${this.bot.username}] Система крафта активна (v${this.version})`);
  }

  canCraft(recipeName) {
    if (!this.mcData || !this.mcData.recipesByName) return false;
    const recipe = this.mcData.recipesByName[recipeName];
    if (!recipe) return false;
    
    // Проверка ингредиентов (упрощённо)
    // В полной версии — проверка this.bot.world.inventory
    return true;
  }

  async craft(recipeName, count = 1) {
    if (!this.canCraft(recipeName)) {
      this.bot.sendChat(`❌ Недостаточно ресурсов для ${recipeName}`);
      return false;
    }
    
    this.bot.sendChat(`✅ Крафчу ${recipeName} x${count}`);
    
    // В полной версии:
    // 1. Открыть верстак
    // 2. Заполнить слоты
    // 3. Нажать "крафт"
    
    return true;
  }

  async autoCraftNeeded() {
    if (!this.active) return;
    
    if (this.bot.world.needsFood()) {
      await this.craft('bread');
    }
    
    // Крафт инструментов при износе
    if (Math.random() < 0.1) {
      await this.craft('wooden_pickaxe');
    }
  }
}

module.exports = CraftingSystem;
