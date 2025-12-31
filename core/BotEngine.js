const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');
const { Vec3 } = require('vec3');
const mcData = require('minecraft-data');
const Movement = require('./Movement');
const SyncHandler = require('./SyncHandler');
const WorldModel = require('./WorldModel');
const BehaviorController = require('./BehaviorController');
const CraftingSystem = require('./CraftingSystem');
const SwarmMemory = require('./ai/SwarmMemory');
const ImitationLearner = require('./ai/ImitationLearner');
const VersionAdapter = require('./VersionAdapter');

class BotEngine {
  constructor(opts) {
    Object.assign(this, opts);
    this.serverId = `${this.host}_${this.port}`;
    this.serverDataFile = path.join(__dirname, '..', this.prefix, 'servers', `${this.serverId}.json`);
    this.configDir = path.join(__dirname, '..', 'config');
    this.client = null;
    this.movement = null;
    this.sync = null;
    this.world = new WorldModel(this.username, this.version);
    this.behavior = new BehaviorController(this);
    this.crafting = new CraftingSystem(this);
    this.swarm = new SwarmMemory(this);
    this.learner = new ImitationLearner(this);
    this.versionAdapter = new VersionAdapter(this.version);
    this.isSpawned = false;
    this.isReconnecting = false;
  }

  async start() {
    this.ensureDirs();
    this.loadConfig();
    this.connect();
  }

  ensureDirs() {
    [path.dirname(this.serverDataFile), this.configDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
  }

  loadConfig() {
    const globalFile = path.join(this.configDir, 'global_settings.json');
    if (!fs.existsSync(globalFile)) {
      fs.writeFileSync(globalFile, JSON.stringify({
        chatCommands: { enabled: true, stopPhrase: 'стоп действие' },
        pathfinding: { maxPathLength: 200 },
        swarm: { enabled: true, shareKnowledge: true }
      }, null, 2));
    }
    this.config = JSON.parse(fs.readFileSync(globalFile, 'utf8'));
  }

  connect() {
    this.client = mc.createClient({
      host: this.host,
      port: this.port,
      username: this.username,
      version: this.version,
      auth: 'offline'
    });

    this.client.on('error', e => this.reconnect(e.message));
    this.client.on('end', () => this.reconnect('соединение закрыто'));
    this.client.on('kicked', r => this.reconnect(r.toString()));
    this.client.on('packet', (data, meta) => this.handlePacket(meta.name, data));
  }

  handlePacket(name, data) {
    // Адаптер версии
    const processed = this.versionAdapter.adaptPacket(name, data);
    if (!processed) return;

    switch (name) {
      case 'login':
        break;
      case 'spawn_position':
      case 'player_position':
        if (!this.isSpawned) {
          this.isSpawned = true;
          this.onSpawn();
        }
        if (data.x !== undefined) {
          this.world.position = new Vec3(data.x, data.y, data.z);
        }
        break;
      case 'chat':
        const msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
        this.handleChat(msg);
        break;
      case 'map_chunk':
        this.world.onChunk(data);
        this.learner.onChunk(data);
        break;
      case 'update_health':
        this.world.health = data.health;
        this.world.food = data.food;
        break;
      case 'chat_message': // 1.19+
        if (typeof data.message === 'object') {
          const text = data.message.text || JSON.stringify(data.message);
          this.handleChat(text);
        }
        break;
      case 'player_list_item':
        this.swarm.onPlayerList(data);
        break;
    }
  }

  onSpawn() {
    const cmds = [`/register ${this.password} ${this.password}`, `/login ${this.password}`];
    cmds.forEach((cmd, i) => setTimeout(() => this.sendChat(cmd), i * 1000));
    this.movement = new Movement(this);
    this.sync = new SyncHandler(this);
    this.behavior.start();
    this.crafting.start();
    this.swarm.start();
    this.learner.start();
  }

  sendChat(msg) {
    if (this.client?.state === 'PLAY') {
      if (this.versionAdapter.useChatCommand) {
        this.client.write('chat_command', { command: msg });
      } else {
        this.client.write('chat', { message: msg });
      }
    }
  }

  handleChat(msg) {
    if (this.config.chatCommands.enabled && msg.includes(this.username) && msg.includes(this.config.chatCommands.stopPhrase)) {
      this.movement.stopAll();
      return;
    }
    const match = msg.match(new RegExp(`^(${this.username})\\s+(\\S+)\\s+(\\d+)\\s+(\\d+)$`));
    if (match) {
      const [, , action, power, speed] = match;
      this.executeCommand(action, parseInt(power), parseInt(speed));
    }
    this.behavior.onChat(msg);
    this.learner.onChat(msg);
  }

  executeCommand(action, power, speed) {
    switch (action) {
      case 'грызть': this.movement.startBreaking(power, speed); break;
      case 'атаковать': this.movement.startAttacking(power, speed); break;
    }
  }

  reconnect(reason) {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.isSpawned = false;
    setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, 8000);
  }

  handleExternalCommand(cmd) {
    this.sync.onAction(cmd);
  }
}
module.exports = BotEngine;