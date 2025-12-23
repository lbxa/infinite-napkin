export interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
    }>;
    synonyms?: string[];
  }>;
}

export interface ParsedDictionaryEntry {
  headwordNorm: string;
  phonetic: string | null;
  audioUrl: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  synonyms: string[];
}

export async function fetchDictionaryEntry(
  word: string
): Promise<ParsedDictionaryEntry | null> {
  const normalized = word.toLowerCase().trim();
  
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Word not found
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data: DictionaryApiResponse[] = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }

    const entry = data[0];
    
    // Extract phonetic with audio preference
    let phonetic: string | null = entry.phonetic || null;
    let audioUrl: string | null = null;
    
    for (const p of entry.phonetics) {
      if (p.audio && p.audio.length > 0) {
        audioUrl = p.audio;
        if (p.text) {
          phonetic = p.text;
        }
        break;
      }
      if (!phonetic && p.text) {
        phonetic = p.text;
      }
    }

    // Get primary meaning and definition
    const primaryMeaning = entry.meanings[0];
    const partOfSpeech = primaryMeaning?.partOfSpeech || null;
    const definition = primaryMeaning?.definitions[0]?.definition || null;

    // Collect synonyms (max 12)
    const allSynonyms = new Set<string>();
    for (const meaning of entry.meanings) {
      if (meaning.synonyms) {
        meaning.synonyms.forEach((s) => allSynonyms.add(s));
      }
      for (const def of meaning.definitions) {
        if (def.synonyms) {
          def.synonyms.forEach((s) => allSynonyms.add(s));
        }
      }
    }
    const synonyms = Array.from(allSynonyms).slice(0, 12);

    return {
      headwordNorm: normalized,
      phonetic,
      audioUrl,
      partOfSpeech,
      definition,
      synonyms,
    };
  } catch (error) {
    console.error('Dictionary API error:', error);
    return null;
  }
}


