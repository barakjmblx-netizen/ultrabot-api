const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class LLMStrategy {
  async getStrategy(prompt) {
    // Пример запроса к Ollama
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: prompt,
          stream: false
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data.response;
      }
    } catch (e) {
      console.warn('🧠 LLM недоступен:', e.message);
    }
    return null;
  }
}
module.exports = LLMStrategy;