const fs = require('fs');
const path = require('path');
const { Vec3 } = require('vec3');
const VersionAdapter = require('./adaptation/VersionAdapter');
const WorldModel = require('./WorldModel');
const BehaviorController = require('./BehaviorController');
const CraftingSystem = require('./CraftingSystem');
const SwarmMemory = require('./swarm/SwarmMemory');
const ImitationLearner = require('./learning/ImitationLearner');

class BotEngine {
  constructor(opts) {
    Object.assign(this, opts);
    this.serverId = `${this.host}_${this.port}`;
    this.serverDataFile = path.join(__dirname, '..', this.prefix, 'servers', `${this.serverId}.json`);
    this.client = null;
    this.adapter = new VersionAdapter(this.version);
    this.world = new WorldModel(this.username, this.version);
    this.behavior = new BehaviorController(this);
    this.crafting = new CraftingSystem(this);
    this.swarm = new SwarmMemory(this.username);
    this.learner = new ImitationLearner(this);
    this.isSpawned = false;
    this.isReconnecting = false;
  }

  async start() {
    this.ensureDirs();
    this.connect();
  }

  ensureDirs() {
    const dir = path.dirname(this.serverDataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  connect() {
    this.client = this.adapter.createClient({
      host: this.host,
      port: this.port,
      username: this.username,
      version: this.version,
      auth: 'offline'
    });

    this.client.on('error', e => this.reconnect(e.message));
    this.client.on('end', () => this.reconnect('end'));
    this.client.on('kicked', r => this.reconnect(r.toString()));
    this.client.on('packet', (data, meta) => this.handlePacket(meta.name, data));
  }

  handlePacket(name, data) {
    if (name === 'spawn_position' || name === 'player_position') {
      if (!this.isSpawned) {
        this.isSpawned = true;
        this.onSpawn();
      }
      if (data.x !== undefined) {
        this.world.position = new Vec3(data.x, data.y, data.z);
      }
    } else if (name === 'chat') {
      const msg = typeof data.message === 'string' ? data.message : JSON.stringify(data.message);
      this.behavior.onChat(msg);
    } else if (name === 'map_chunk') {
      this.world.onChunk(data);
    } else if (name === 'spawn_entity') {
      this.learner.observeEntitySpawn(data);
    } else if (name === 'entity_move') {
      this.learner.observeEntityMove(data);
    }
  }

  onSpawn() {
    this.adapter.sendChat(this.client, `/register ${this.password} ${this.password}`);
    setTimeout(() => this.adapter.sendChat(this.client, `/login ${this.password}`), 2000);
    this.behavior.start();
    this.crafting.start();
    this.swarm.joinSwarm();
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
    this.behavior.onExternalAction(cmd);
  }
}
module.exports = BotEngine;