const fs = require('fs');
const axios = require('axios');

async function fetchVersions() {
  try {
    const response = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const versions = response.data.versions.filter(v => v.type === 'release').map(v => v.id);
    const latest = versions.slice(0, 20);
    console.log('📋 Получены последние версии:', latest.join(', '));
    return latest;
  } catch (e) {
    console.error('❌ Не удалось получить версии:', e.message);
    return ['1.21', '1.20.4', '1.19.4', '1.18.2'];
  }
}

async function updateVersionFolders() {
  const versions = await fetchVersions();
  const versionsDir = './versions';

  for (const version of versions) {
    const versionDir = `${versionsDir}/${version}`;
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
      const template = fs.readFileSync('./templates/bot_template.js', 'utf8');
      fs.writeFileSync(`${versionDir}/bot.js`, template.replace(/{{VERSION}}/g, version));
      console.log(`🆕 Создан шаблон для ${version}`);
    }
  }
}

updateVersionFolders().catch(console.error);
