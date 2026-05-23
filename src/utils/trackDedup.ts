export function normalizeTitleRobust(title: string) {
  return title.toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ') // remove parens
    .replace(/\b(official|video|audio|lyric|lyrics|lyrical|remix|hd|4k|ft|feat|featuring|music|visualiser|visualizer|version|female|male|cover|status|whatsapp|new|song|romantic|best|hits|live|original|full|slowed|reverb|lofi|chill|aesthetic|vibe|explore|trending|viral|shots|shorts|emotional)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ') // replace special chars with space
    .trim()
    .replace(/\s+/g, ' ') // collapse spaces
    .replace(/(.)\1+/g, '$1'); // deduplicate adjacent letters (saawariya -> sawariya)
}

export function getWords(norm: string) {
  return new Set(norm.split(' ').filter(w => w.length > 2));
}

export function areTitlesSimilar(title1: string, title2: string): boolean {
  const norm1 = normalizeTitleRobust(title1);
  const norm2 = normalizeTitleRobust(title2);

  if (norm1.length < 4 || norm2.length < 4) {
    return norm1 === norm2 && norm1.length > 0;
  }

  // 1. Direct substring match for sufficiently long titles
  if (norm1.length > 10 && norm2.length > 10) {
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
  }

  // 2. Word subset match
  const words1 = getWords(norm1);
  const words2 = getWords(norm2);

  if (words1.size > 0 && words2.size > 0) {
    let intersection = 0;
    words1.forEach(w => {
      if (words2.has(w)) intersection++;
    });

    const minWords = Math.min(words1.size, words2.size);
    
    // OVERLAP COEFFICIENT: If they share at least 3 words AND one is 75%+ subset of the other
    // (Prevents short artist names from false positive, e.g. "Arijit Singh" = 2 words)
    if (intersection >= 3 && (intersection / minWords) >= 0.75) {
      return true;
    }

    // JACCARD SIMILARITY: If they share 40%+ of their combined unique words
    // (Catches two long spammy titles that share many words)
    const union = words1.size + words2.size - intersection;
    if (union > 0 && (intersection / union) >= 0.4) {
      return true;
    }
  }

  return false;
}
