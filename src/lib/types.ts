export interface DictDefinition {
    definition: string;
    example?: string;
}
export interface DictMeaning {
    partOfSpeech: string;
    definitions: DictDefinition[];
}
export interface DictEntry {
    word: string;
    meanings: DictMeaning[];
}

export interface SearchWordResponse {
    status: "success" | "failed";
    statusCode: number;
    message: string | null;
    data: SearchResult | null;
}

export type SearchResult = {
    word: string;
    def?: string;
    allMeanings: { pos: string; definitions: string[] }[];
} | null;

/** Payload sent when adding a word to vocabulary */
export interface AddWordMeaningPayload {
    pos: string;
    definitions: string[];
    personalMeaning?: string;
    personalExample?: string;
}

// Payload sent to the function
export interface AddWordPayload {
    word: string;
    meanings: AddWordMeaningPayload[];
}

// export interface RecentWord {
//     word: string;
//     createdAt: Date;
//     meanings: string;
//     status: "success" | "failed";
//     message: string | null;
// }

/** Logged-in user exposed in layout data (safe for client) */
export type PublicUser = {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    /** ISO 8601 string */
    createdAt: string;
};

/** Vocabulary level display (driven by word count) */
export type VocabularyLevelInfo = {
    level: number;
    isMaxed: boolean;
    progressInLevel: number;
    wordsToNext: number;
};

export type ProfileStats = {
    totalWords: number;
    streakDays: number;
    weeklyProgressPercent: number;
    level: VocabularyLevelInfo;
};

/** Stacked bar bucket for progress charts (words by part of speech) */
export type ProgressBarBucket = {
    label: string;
    periodStart: string;
    periodEnd: string;
    noun: number;
    verb: number;
    adjective: number;
    adverb: number;
    total: number;
};

export interface VocabularyWord {
    id: string;
    word: string;
    createdAt: Date;
    meanings: {
        dictionaryMeaning: string;
        type: "noun" | "verb" | "adjective" | "adverb";
        personalMeaning: string | null;
        examples: {
            dictionaryExample: string | null;
            personalExample: string | null;
        }[];
    }[];
    isFavorite: boolean;
}