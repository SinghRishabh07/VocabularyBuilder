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
    allMeanings: { pos: string; definitions: string[]; examples?: string[] }[];
} | null;

/** Payload sent when adding a word to vocabulary */
export interface AddWordMeaningPayload {
    pos: string;
    definitions: string[];
    /** Dictionary / context example sentences (first one is stored) */
    examples?: string[];
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
    /** Words added in the last 7 days */
    weeklyWordsAdded: number;
    /** dailyWordGoal × 7 */
    weeklyTarget: number;
    dailyWordGoal: number;
    favoriteWords: number;
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
        id: string;
        dictionaryMeaning: string;
        type: "noun" | "verb" | "adjective" | "adverb";
        personalMeaning: string | null;
        examples: {
            id: string;
            dictionaryExample: string | null;
            personalExample: string | null;
        }[];
    }[];
    isFavorite: boolean;
}

export type PosKey = "noun" | "verb" | "adjective" | "adverb";

/** One vocabulary suggestion from the paragraph analyzer */
export interface AnalyzedWord {
    /** Dictionary base form — this is what gets saved */
    word: string;
    /** The form as it appeared in the paragraph */
    surface: string;
    pos: PosKey;
    /** Definition of the sense used in the paragraph */
    meaning: string;
    /** Plain-English explanation (AI engine only) */
    simple: string | null;
    /** Dictionary example sentence, if any */
    example: string | null;
    /** Sentence from the paragraph containing the word */
    sentence: string;
    occurrences: number;
}

export interface AnalyzeResponse {
    engine: "ai" | "dictionary";
    words: AnalyzedWord[];
    /** Words found in the text that are already in the user's vocabulary */
    skippedSaved: string[];
}

export interface SaveWordsResponse {
    created: { id: string; word: string }[];
    /** Words that were already in the collection (not duplicated) */
    skipped: string[];
    invalid: string[];
}

// ── Revision ────────────────────────────────────────────────

export type ReviewGrade = "forgot" | "hard" | "good";

export type ReviewActivity = "flashcard" | "meaning-mcq" | "word-mcq" | "fill-blank";

export interface ReviewItem {
    wordId: string;
    word: string;
    pos: PosKey;
    meaning: string;
    activity: ReviewActivity;
    /** MCQ options (meanings for meaning-mcq, words for word-mcq) incl. the answer */
    options?: string[];
    /** Sentence with the word replaced by "_____" (fill-blank) */
    cloze?: string;
    /** The exact form removed from the cloze sentence (e.g. "mitigating") */
    answerForm?: string;
    /** Example sentence to show after answering (any activity) */
    example?: string | null;
    /** Why this word was picked, for gentle UI hints */
    reason: "new" | "due" | "struggling" | "practice";
}

export interface ReviewOverview {
    totalWords: number;
    dueNow: number;
    newWords: number;
    struggling: number;
    mastered: number;
    reviewStreak: number;
    reviewedToday: number;
    lastSession: { answered: number; correct: number; completedAt: string | null } | null;
    needsPractice: { id: string; word: string; lapses: number; accuracy: number | null }[];
}
