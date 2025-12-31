const { Vec3 } = require('vec3');
class WorldModel {
  constructor(username, version) {
    this.username = username;
    this.version = version;
    this.position = new Vec3(0, 0, 0);
    this.chunks = new Map();
  }
  onChunk(packet) { this.chunks.set(`${packet.x},${packet.z}`, packet); }
}
module.exports = WorldModel;