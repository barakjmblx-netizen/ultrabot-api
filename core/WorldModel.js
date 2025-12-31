const { Vec3 } = require('vec3');
const mcData = require('minecraft-data');

class WorldModel {
  constructor(username, version) {
    this.username = username;
    this.version = version;
    this.mcData = mcData(version);
    
    // Позиция
    this.position = new Vec3(0, 0, 0);
    this.spawnPosition = null;
    
    // Состояние
    this.health = 20;
    this.food = 20;
    this.saturation = 5.0;
    this.isAlive = true;
    
    // Инвентарь
    this.inventory = {};
    this.heldItem = null;
    
    // Память
    this.goals = [];
    this.fears = new Set(); // названия мобов
    this.relationships = {}; // { playerName: { trust: 0.0-1.0, alliance: bool, love: bool } }
    this.habits = []; // ['always cooks food', 'builds at night']
    this.beliefs = []; // ['capitalism', 'christianity', 'satanism']
    
    // Кэш чанков
    this.chunks = new Map(); // "x,z" -> chunkData
    
    // Инициализация данных выживания
    this.initSurvivalData();
  }

  initSurvivalData() {
    // Съедобные предметы
    this.edibleItems = [
      'apple', 'bread', 'cooked_beef', 'cooked_chicken', 'cooked_mutton', 'cooked_porkchop',
      'cooked_rabbit', 'cooked_salmon', 'cookie', 'melon_slice', 'mushroom_stew',
      'pumpkin_pie', 'rabbit_stew', 'beetroot_soup'
    ];
    
    // Материалы для строительства
    this.buildingBlocks = [
      'cobblestone', 'stone', 'dirt', 'wood', 'planks', 'oak_planks', 'spruce_planks',
      'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks',
      'sandstone', 'nether_bricks', 'bricks'
    ];
    
    // Опасные мобы
    this.dangerousMobs = [
      'zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'blaze', 'ghast'
    ];
    
    // Предметы для крафта
    this.craftingMaterials = [
      'stick', 'planks', 'cobblestone', 'iron_ingot', 'gold_ingot', 'diamond'
    ];
  }

  remember(event) {
    const timestamp = new Date().toISOString();
    console.log(`🧠 [${this.username}] ${timestamp}: ${event}`);
  }

  fear(mobType) {
    this.fears.add(mobType);
    this.remember(`Боится ${mobType}`);
  }

  buildRelationship(playerName, type = 'neutral', strength = 0.5) {
    if (!this.relationships[playerName]) {
      this.relationships[playerName] = {};
    }
    this.relationships[playerName][type] = strength;
    this.remember(`Отношение к ${playerName}: ${type} (${strength})`);
  }

  onInventoryUpdate(data) {
    // Обновление инвентаря (упрощённо)
    if (data.slot === 36) { // основная рука
      this.heldItem = data.item;
    }
    // В полной версии — парсинг всего инвентаря
  }

  onEntitySpawn(data) {
    // Обработка спавна мобов/игроков
    let entityType = 'unknown';
    if (data.type) {
      entityType = this.getEntityNameFromType(data.type);
    }
    this.remember(`Обнаружен ${entityType} в ${data.x}, ${data.y}, ${data.z}`);
  }

  onEntityDestroy(data) {
    this.remember(`Сущность уничтожена: ${data.entityId}`);
  }

  getEntityNameFromType(typeId) {
    if (!this.mcData || !this.mcData.entities) return 'unknown';
    const entity = Object.values(this.mcData.entities).find(e => e.id === typeId);
    return entity ? entity.name : 'unknown';
  }

  needsFood() {
    return this.food < 8;
  }

  findNearestBlock(blockName, maxDistance = 32) {
    // В реальности — поиск в this.chunks
    return null;
  }

  isBlockWalkable(blockName) {
    const nonSolid = ['air', 'water', 'lava', 'grass', 'tall_grass', 'fern'];
    return nonSolid.includes(blockName) || blockName.endsWith('_door') || blockName.endsWith('_trapdoor');
  }
}

module.exports = WorldModel;
