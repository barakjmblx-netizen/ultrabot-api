const fs = require('fs');
const path = require('path');
const mc = require('minecraft-protocol');
const mcData = require('minecraft-data');

const [,, username, host, portStr, version, password = '123456789Q', prefix = 'data'] = process.argv;
const port = parseInt(portStr, 10);

if (!username || !host || isNaN(port) || !version) {
  console.error('❌ Использование: node index.js <username> <host> <port> <version> [password] [prefix]');
  process.exit(1);
}

const supported = Object.keys(mcData.versionsByMinecraftVersion);
if (!supported.includes(version)) {
  console.error(`❌ Версия ${version} не поддерживается.`);
  process.exit(1);
}

const BotEngine = require('./core/BotEngine');
const bot = new BotEngine({ username, host, port, version, password, prefix });
bot.start().catch(e => {
  console.error('💀 Критическая ошибка:', e);
  process.exit(1);
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  chunk.trim().split('\n').forEach(line => {
    if (line) {
      try { bot.handleExternalCommand(JSON.parse(line)); }
      catch (e) { console.warn('⚠️ Неверная команда:', line); }
    }
  });
});
