const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class MinecraftWikiAPI {
  async getRecipe(itemName) {
    try {
      const response = await fetch(`https://wikiapi.example.com/recipes/${itemName}`); // Заглушка — замени на реальный API
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('🌐 Не удалось получить рецепт из Wiki:', e.message);
    }
    return null;
  }
}
module.exports = MinecraftWikiAPI;