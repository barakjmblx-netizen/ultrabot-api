class CraftingSystem {
  constructor(bot) { this.bot = bot; }
  start() {
    const wiki = require('./external_api/MinecraftWikiAPI');
    new wiki().getRecipe('diamond_pickaxe').then(recipe => {
      if (recipe) console.log(`📋 Рецепт:`, recipe);
    });
  }
}
module.exports = CraftingSystem;