const Heap = require('heap');
const { Vec3 } = require('vec3');

class ChunkNavigator {
  constructor(bot) {
    this.bot = bot;
    this.chunks = new Map(); // "x,z" -> chunkData
    this.blockCache = new Map(); // "x,y,z" -> blockName
    this.isMoving = false;
    this.currentPath = null;
  }

  onChunk(packet) {
    const key = `${packet.x},${packet.z}`;
    this.chunks.set(key, packet);
    // В полной версии — парсинг chunk.sections для получения блоков
  }

  getBlockAt(x, y, z) {
    // Кэширование для производительности
    const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    if (this.blockCache.has(key)) {
      return this.blockCache.get(key);
    }

    // Определение чанка
    const chunkX = Math.floor(x / 16);
    const chunkZ = Math.floor(z / 16);
    const chunkKey = `${chunkX},${chunkZ}`;
    
    if (!this.chunks.has(chunkKey)) {
      return 'unknown'; // чанк не загружен
    }

    // В реальности — парсинг байтов чанка
    // Пока возвращаем air для простоты
    const blockName = (y < 60) ? 'stone' : 'air';
    this.blockCache.set(key, blockName);
    return blockName;
  }

  isWalkable(x, y, z) {
    const block = this.getBlockAt(x, y, z);
    const above = this.getBlockAt(x, y + 1, z);
    
    // Можно стоять, если текущий блок — сплошной, а над головой — воздух
    const solidBlocks = ['stone', 'dirt', 'grass', 'cobblestone', 'planks', 'wood'];
    const airBlocks = ['air', 'water', 'lava'];
    
    return solidBlocks.includes(block) && airBlocks.includes(above);
  }

  heuristic(a, b) {
    return a.distanceTo(b);
  }

  findPath(start, goal) {
    if (!start || !goal) return null;
    
    const startPos = new Vec3(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z));
    const goalPos = new Vec3(Math.floor(goal.x), Math.floor(goal.y), Math.floor(goal.z));
    
    const openSet = new Heap((a, b) => a.f - b.f);
    const startNode = { 
      pos: startPos, 
      g: 0, 
      f: this.heuristic(startPos, goalPos), 
      parent: null 
    };
    openSet.push(startNode);
    
    const closedSet = new Set();
    const maxNodes = this.bot.globalConfig.movement.pathfinding.maxPathLength || 100;
    let nodesExpanded = 0;

    while (!openSet.empty() && nodesExpanded < maxNodes) {
      const current = openSet.pop();
      const key = `${current.pos.x},${current.pos.y},${current.pos.z}`;
      
      if (closedSet.has(key)) continue;
      closedSet.add(key);
      nodesExpanded++;

      // Проверка цели
      if (current.pos.distanceTo(goalPos) < 2) {
        const path = [];
        let node = current;
        while (node) {
          path.unshift(new Vec3(node.pos.x + 0.5, node.pos.y + 0.1, node.pos.z + 0.5));
          node = node.parent;
        }
        return path;
      }

      // Генерация соседей
      const directions = [
        [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
        [0, 1, 0], [0, -1, 0]
      ];

      for (const [dx, dy, dz] of directions) {
        const nextPos = current.pos.offset(dx, dy, dz);
        const nextKey = `${nextPos.x},${nextPos.y},${nextPos.z}`;
        
        if (closedSet.has(nextKey)) continue;
        if (!this.isWalkable(nextPos.x, nextPos.y, nextPos.z)) continue;

        const g = current.g + 1;
        const h = this.heuristic(nextPos, goalPos);
        const f = g + h;
        
        openSet.push({
          pos: nextPos,
          g: g,
          f: f,
          parent: current
        });
      }
    }

    console.warn(`🧭 [${this.bot.username}] Путь не найден после ${nodesExpanded} узлов`);
    return null;
  }

  async moveAlongPath(path) {
    if (!path || path.length === 0 || this.isMoving) return;
    
    this.isMoving = true;
    this.currentPath = path;
    
    for (const pos of path) {
      if (!this.isMoving || !this.bot.movement) break;
      
      // Отправка позиции
      this.bot.movement.sendPosition(pos.x, pos.y, pos.z, true);
      
      // Ждём, пока бот приблизится
      await this.waitForArrival(pos, 1000);
      
      // Короткая пауза
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isMoving = false;
    this.currentPath = null;
    console.log(`✅ [${this.bot.username}] Путь пройден.`);
  }

  async waitForArrival(target, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!this.bot.world.position) continue;
      const dist = this.bot.world.position.distanceTo(target);
      if (dist < 1.0) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }

  stop() {
    this.isMoving = false;
    this.currentPath = null;
  }
}

module.exports = ChunkNavigator;
