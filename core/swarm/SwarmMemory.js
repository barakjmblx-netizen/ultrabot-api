const fs = require('fs');
const path = require('path');

// Распределённая память: все боты читают/пишут в общий файл
class SwarmMemory {
  constructor(username) {
    this.username = username;
    this.swarmFile = path.join(__dirname, '..', '..', '..', 'data', 'swarm_memory.json');
    this.ensureSwarmFile();
  }

  ensureSwarmFile() {
    const dir = path.dirname(this.swarmFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.swarmFile)) {
      fs.writeFileSync(this.swarmFile, JSON.stringify({ resources: [], threats: [], knowledge: [] }, null, 2));
    }
  }

  joinSwarm() {
    console.log(`🧠 [${this.username}] Присоединился к рое.`);
  }

  addResource(type, pos) {
    const data = JSON.parse(fs.readFileSync(this.swarmFile, 'utf8'));
    data.resources.push({ type, pos, foundBy: this.username, time: Date.now() });
    fs.writeFileSync(this.swarmFile, JSON.stringify(data, null, 2));
    console.log(`💎 [${this.username}] Ресурс ${type} добавлен в рой.`);
  }

  getAllResources() {
    const data = JSON.parse(fs.readFileSync(this.swarmFile, 'utf8'));
    return data.resources;
  }

  addKnowledge(key, value) {
    const data = JSON.parse(fs.readFileSync(this.swarmFile, 'utf8'));
    data.knowledge.push({ key, value, by: this.username, time: Date.now() });
    fs.writeFileSync(this.swarmFile, JSON.stringify(data, null, 2));
  }
}
module.exports = SwarmMemory;