import wordsData from './words.json' with { type: 'json' };

export function generateSearchQueries(count: number): string[] {
  const queries = new Set<string>();
  const { topics, prefixes, nouns } = wordsData;

  // 1. Agregar temas predefinidos aleatorizados
  const shuffledTopics = [...topics].sort(() => 0.5 - Math.random());
  for (const topic of shuffledTopics) {
    if (queries.size >= count) break;
    queries.add(topic);
  }

  // 2. Generar combinaciones prefix + noun
  while (queries.size < count) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomSuffix = Math.floor(Math.random() * 1000);
    const query = `${prefix} ${noun}`;
    if (!queries.has(query)) {
      queries.add(query);
    } else {
      queries.add(`${query} ${randomSuffix}`);
    }
  }

  return Array.from(queries).slice(0, count);
}

export function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
