const fs = require('fs');
const path = require('path');
const mc = require('minecraft-protocol');
const mcData = require('minecraft-data');

// === ПАРАМЕТРЫ ЗАПУСКА ===
const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('❌ Использование: node index.js <username> <host> <port> <version> [password] [prefix]');
  console.error('   Пример: node index.js Bot1 127.0.0.1 25565 1.21 mypass data');
  process.exit(1);
}

const [username, host, portStr, version, password = '123456789Q', prefix = 'data'] = args;
const port = parseInt(portStr, 10);

if (isNaN(port)) {
  console.error('❌ Порт должен быть числом');
  process.exit(1);
}

// === ПРОВЕРКА ВЕРСИИ ===
let supportedVersions;
try {
  supportedVersions = Object.keys(mcData.versionsByMinecraftVersion);
} catch (e) {
  supportedVersions = mc.supportedVersions || ['1.21', '1.20.4', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.12.2', '1.8.9'];
}

if (!supportedVersions.includes(version)) {
  console.error(`❌ Версия ${version} не поддерживается.`);
  console.error(`✅ Поддерживаемые версии (последние):`);
  console.error(supportedVersions.slice(0, 15).join('\n'));
  process.exit(1);
}

// === АВТО-СОЗДАНИЕ ШАБЛОНА ===
const versionsDir = path.join(__dirname, 'versions');
const versionDir = path.join(versionsDir, version);
const botFile = path.join(versionDir, 'bot.js');

if (!fs.existsSync(botFile)) {
  const templatePath = path.join(__dirname, 'templates', 'bot_template.js');
  if (!fs.existsSync(templatePath)) {
    console.error('❌ Шаблон не найден: templates/bot_template.js');
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');
  fs.mkdirSync(versionDir, { recursive: true });
  const finalTemplate = template
    .replace(/{{VERSION}}/g, version)
    .replace(/{{USERNAME}}/g, username);
  fs.writeFileSync(botFile, finalTemplate, 'utf8');
  console.log(`🆕 Шаблон для версии ${version} создан.`);
}

// === ЗАПУСК БОТА ===
const BotEngine = require('./core/BotEngine');
const bot = new BotEngine({ username, host, port, version, password, prefix });
bot.start().catch(err => {
  console.error('💀 Критическая ошибка в боте:', err);
  process.exit(1);
});

// === ВНЕШНИЕ КОМАНДЫ (stdin) ===
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  const lines = chunk.trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const cmd = JSON.parse(line);
      bot.handleExternalCommand(cmd);
    } catch (e) {
      console.warn('⚠️ Неверная команда из stdin:', line);
    }
  }
});

// === ГРАЦИОЗНОЕ ЗАВЕРШЕНИЕ ===
process.on('SIGINT', () => {
  console.log('\n🛑 Получен SIGINT. Завершение...');
  if (bot && bot.client) bot.client.end();
  process.exit(0);
});
