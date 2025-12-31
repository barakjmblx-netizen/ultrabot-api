const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');
const { Vec3 } = require('vec3');
const Movement = require('./Movement');
const SyncHandler = require('./SyncHandler');
const WorldModel = require('./WorldModel');
const BehaviorController = require('./BehaviorController');
const CraftingSystem = require('./CraftingSystem');

class BotEngine {
  constructor(opts) {
    // Обязательные параметры
    this.username = opts.username;
    this.host = opts.host;
    this.port = opts.port;
    this.version = opts.version;
    this.password = opts.password || '123456789Q';
    this.prefix = opts.prefix || 'data';

    // Производные параметры
    this.serverId = `${this.host}_${this.port}`;
    this.serverDataFile = path.join(__dirname, '..', this.prefix, 'servers', `${this.serverId}.json`);
    this.configDir = path.join(__dirname, '..', 'config');
    this.globalConfigFile = path.join(this.configDir, 'global_settings.json');
    this.waveConfigFile = path.join(this.configDir, 'wave_settings.json');

    // Состояние
    this.client = null;
    this.movement = null;
    this.sync = null;
    this.world = new WorldModel(this.username, this.version);
    this.behavior = new BehaviorController(this);
    this.crafting = new CraftingSystem(this);
    this.modules = {};
    this.isSpawned = false;
    this.isReconnecting = false;
    this.chatCommandBuffer = '';
  }

  async start() {
    console.log(`🤖 [${this.username}] Инициализация ULTRABOT API v3.0...`);
    this.ensureDirectories();
    await this.loadGlobalConfig();
    this.connect();
  }

  ensureDirectories() {
    const dirs = [
      path.dirname(this.serverDataFile),
      this.configDir
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Создана директория: ${dir}`);
      }
    });
  }

  async loadGlobalConfig() {
    // Глобальные настройки
    if (!fs.existsSync(this.globalConfigFile)) {
      const defaultConfig = {
        movement: {
          crouch: { enabled: false, frequency: 1, interval: 3000, unit: 'ms' },
          attack: { enabled: false, hits: 1, interval: 1000, unit: 'ms' },
          jump: { enabled: false, jumps: 1, interval: 2000, unit: 'ms' },
          sprint: { enabled: false, duration: 2000, interval: 5000, unit: 'ms' },
          stand: { enabled: true, stopDuration: 1000, resumeAfter: 3000, unit: 'ms' },
          spin: { enabled: false, speed: 0.1, useIntervals: false, stopDuration: 1000, resumeAfter: 2000, spinHead: false, headSpeed: 0.1 },
          followOwner: true,
          pathfinding: { enabled: true, avoidDrops: true, avoidHostile: true, maxPathLength: 100 }
        },
        survival: {
          autoEat: true,
          autoCraft: true,
          buildShelter: true,
          fearHostile: true
        },
        chatCommands: {
          enabled: true,
          prefix: '',
          stopPhrase: 'стоп действие'
        }
      };
      fs.writeFileSync(this.globalConfigFile, JSON.stringify(defaultConfig, null, 2));
      console.log(`⚙️  Создан файл настроек: ${this.globalConfigFile}`);
    }

    // Настройки волн
    if (!fs.existsSync(this.waveConfigFile)) {
      const waveConfig = {
        enabled: false,
        botsPerWave: 5,
        intervalBetweenWaves: 10000,
        intervalBetweenBots: 1000,
        reconnectAttempts: 3,
        reconnectDelay: 8000
      };
      fs.writeFileSync(this.waveConfigFile, JSON.stringify(waveConfig, null, 2));
      console.log(`🌊 Создан файл волн: ${this.waveConfigFile}`);
    }

    this.globalConfig = JSON.parse(fs.readFileSync(this.globalConfigFile, 'utf8'));
    this.waveConfig = JSON.parse(fs.readFileSync(this.waveConfigFile, 'utf8'));
  }

  connect() {
    console.log(`🌐 [${this.username}] Подключение к ${this.host}:${this.port} (v${this.version})...`);
    this.client = mc.createClient({
      host: this.host,
      port: this.port,
      username: this.username,
      version: this.version,
      auth: 'offline',
      // Улучшенная обработка чанков
      skipValidation: true
    });

    // Обработчики событий
    this.client.on('error', (err) => this.handleDisconnect(`Ошибка: ${err.message}`));
    this.client.on('end', () => this.handleDisconnect('Соединение закрыто'));
    this.client.on('kicked', (reason) => this.handleDisconnect(`Кик: ${reason.toString()}`));

    // Обработка всех пакетов
    this.client.on('packet', (data, meta) => {
      this.handlePacket(meta.name, data);
    });
  }

  handlePacket(packetName, data) {
    switch (packetName) {
      case 'login':
        console.log(`✅ [${this.username}] Успешный вход на сервер.`);
        break;

      case 'spawn_position':
      case 'player_position':
      case 'position':
        if (!this.isSpawned) {
          this.isSpawned = true;
          this.onFirstSpawn();
        }
        // Обновляем позицию
        if (data.x !== undefined) {
          this.world.position = new Vec3(data.x, data.y, data.z);
          if (!this.world.spawnPosition) {
            this.world.spawnPosition = this.world.position.clone();
          }
        }
        break;

      case 'chat':
        try {
          const msg = typeof data.message === 'string' 
            ? data.message 
            : (typeof data.message === 'object' ? JSON.stringify(data.message) : String(data.message));
          this.handleChatMessage(msg);
        } catch (e) {
          console.warn(`⚠️ [${this.username}] Ошибка обработки чата:`, e.message);
        }
        break;

      case 'map_chunk':
        if (this.behavior.navigator) {
          this.behavior.navigator.onChunk(data);
        }
        break;

      case 'spawn_entity':
      case 'named_entity_spawn':
        // Обработка мобов и игроков
        this.world.onEntitySpawn(data);
        break;

      case 'entity_destroy':
        this.world.onEntityDestroy(data);
        break;

      case 'update_health':
        this.world.health = data.health;
        this.world.food = data.food;
        this.world.saturation = data.foodSaturation;
        if (data.health <= 0) {
          this.world.isAlive = false;
          console.log(`💀 [${this.username}] Погиб! Здоровье: ${data.health}`);
        }
        break;

      case 'held_item_slot':
      case 'set_slot':
        this.world.onInventoryUpdate(data);
        break;

      default:
        // Игнорируем остальные пакеты для производительности
        break;
    }
  }

  onFirstSpawn() {
    console.log(`🧍 [${this.username}] Спавн → регистрация/логин...`);
    
    // Всегда отправляем регистрацию и логин
    const commands = [
      `/register ${this.password} ${this.password}`,
      `/reg ${this.password} ${this.password}`,
      `/login ${this.password}`,
      `/log ${this.password}`
    ];

    commands.forEach((cmd, i) => {
      setTimeout(() => {
        this.sendChat(cmd);
      }, i * 1000);
    });

    // Помечаем, что пытались
    this.markRegistered();

    // Инициализация систем
    this.movement = new Movement(this);
    this.sync = new SyncHandler(this);
    this.behavior.start();
    this.crafting.start();

    console.log(`✨ [${this.username}] Все системы запущены.`);
  }

  sendChat(message) {
    if (this.client && this.client.state === 'PLAY') {
      this.client.write('chat', { message: String(message) });
    }
  }

  markRegistered() {
    try {
      const dir = path.dirname(this.serverDataFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.serverDataFile, JSON.stringify({ 
        hasEverRegistered: true,
        lastLogin: new Date().toISOString(),
        version: this.version
      }, null, 2));
    } catch (e) {
      console.warn(`⚠️ [${this.username}] Не удалось сохранить состояние:`, e.message);
    }
  }

  async handleDisconnect(reason) {
    console.warn(`❌ [${this.username}] Отключён: ${reason}`);
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.isSpawned = false;

    // Поведение при отключении
    this.behavior.onDisconnect();
    if (this.movement) this.movement.stopAll();

    // Переподключение
    const delayMs = this.waveConfig.reconnectDelay || 8000;
    console.log(`⏳ [${this.username}] Переподключение через ${delayMs} мс...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    this.isReconnecting = false;
    this.connect();
  }

  // === ОБРАБОТКА ЧАТА ===
  handleChatMessage(rawMessage) {
    const cleanMsg = rawMessage.replace(/§[0-9a-fk-or]/g, ''); // убираем цвета
    const lowerMsg = cleanMsg.toLowerCase();

    // Логирование
    if (lowerMsg.includes('success') || lowerMsg.includes('успеш') || lowerMsg.includes('welcome') || lowerMsg.includes('logged')) {
      console.log(`💬 [${this.username}] Подтверждение входа: ${cleanMsg}`);
    }

    // Обработка команд
    if (this.globalConfig.chatCommands.enabled) {
      this.parseChatCommand(cleanMsg);
    }

    // Передача в поведение
    this.behavior.onChatMessage(cleanMsg);
  }

  parseChatCommand(message) {
    const prefix = this.globalConfig.chatCommands.prefix;
    const stopPhrase = this.globalConfig.chatCommands.stopPhrase;

    // Команда остановки
    if (message.includes(this.username) && message.includes(stopPhrase)) {
      this.stopAllActions();
      this.sendChat(`🛑 ${this.username}: Все действия остановлены.`);
      return;
    }

    // Команда вида: "Bot001 грызть 2 32"
    const regex = new RegExp(`^${prefix}?(${this.username})\\s+(\\S+)\\s+(\\d+)\\s+(\\d+)$`);
    const match = message.match(regex);
    if (match) {
      const [, botName, action, powerStr, speedStr] = match;
      const power = parseInt(powerStr, 10);
      const speed = parseInt(speedStr, 10);
      this.executeChatCommand(action, power, speed);
      return;
    }
  }

  executeChatCommand(action, power, speed) {
    console.log(`📜 [${this.username}] Команда: ${action} (сила=${power}, скорость=${speed})`);
    switch (action) {
      case 'грызть':
      case 'ломать':
      case 'рубить':
        this.movement.startBreaking(power, speed);
        break;
      case 'строить':
        this.behavior.buildStructure(power);
        break;
      case 'идти':
        this.behavior.moveToTarget(power, speed);
        break;
      case 'атаковать':
        this.movement.startAttacking(power, speed);
        break;
      case 'плыть':
        this.movement.enableSwimming();
        break;
      case 'бежать':
        this.movement.setControl('sprint', true);
        break;
      default:
        this.sendChat(`❓ Неизвестное действие: ${action}`);
    }
  }

  stopAllActions() {
    if (this.movement) this.movement.stopAll();
    if (this.behavior) this.behavior.stopCurrentTask();
  }

  // === ВНЕШНИЕ КОМАНДЫ (от Python через stdin) ===
  handleExternalCommand(cmd) {
    if (this.sync) {
      this.sync.onOwnerAction(cmd);
    }
  }
}

module.exports = BotEngine;
