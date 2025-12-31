const Heap = require('heap');
const { Vec3 } = require('vec3');

class ChunkNavigator {
  constructor(bot) { this.bot = bot; }

  isWalkable(pos) {
    const block = this.bot.world.getBlock(pos.x, pos.y - 1, pos.z);
    const head = this.bot.world.getBlock(pos.x, pos.y, pos.z);
    return block && !this.isSolid(block) && head && this.isAir(head);
  }

  isSolid(block) { return block.name !== 'air'; }
  isAir(block) { return block.name === 'air'; }

  heuristic(a, b) { return a.distanceTo(b); }

  findPath(start, goal) {
    const open = new Heap((a, b) => a.f - b.f);
    open.push({ pos: start.clone(), g: 0, f: this.heuristic(start, goal), parent: null });
    const closed = new Set();

    while (!open.empty()) {
      const current = open.pop();
      const key = `${current.pos.x},${current.pos.y},${current.pos.z}`;
      if (closed.has(key)) continue;
      closed.add(key);

      if (current.pos.distanceTo(goal) < 1.5) {
        const path = []; let node = current;
        while (node) { path.unshift(node.pos); node = node.parent; }
        return path;
      }

      for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]]) {
        const next = current.pos.offset(dx, dy, dz);
        if (closed.has(`${next.x},${next.y},${next.z}`)) continue;
        if (!this.isWalkable(next)) continue;
        const g = current.g + 1;
        const f = g + this.heuristic(next, goal);
        open.push({ pos: next, g, f, parent: current });
      }
    }
    return null;
  }

  async move(path) {
    for (const pos of path) {
      this.bot.movement.setControl('forward', true);
      this.bot.client.write('position_look', { x: pos.x, y: pos.y, z: pos.z, yaw: 0, pitch: 0, onGround: true });
      await new Promise(r => setTimeout(r, 300));
    }
  }
}
module.exports = ChunkNavigator;