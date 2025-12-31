/**
 * Шаблон бота для версии {{VERSION}}
 */

module.exports = (bot) => {
  console.log(`[ULTRABOT v{{VERSION}}] Бот запущен.`);

  // Пример: бот нашёл алмаз
  bot.world.onFindOre = (x, y, z) => {
    bot.swarm.onFindOre(x, y, z);
  };

  // Пример: обучение от игрока
  bot.learner.learnCraftingFromPlayer = (player, recipe) => {
    console.log(`🤖 Изучаю крафт: ${recipe} от ${player}`);
  };
};
