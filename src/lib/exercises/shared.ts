export const exerciseLabels = {
  DAILY_ARTICLE: "Daily Article",
  SYNONYM_HUNTER: "Synonym Hunter",
  CONTEXT_CLUES: "Context Clues",
  ACADEMIC_VOCABULARY: "Academic Vocabulary",
  SHORT_PODCAST: "Short Podcasts",
  DAILY_CONVERSATION: "Daily Conversations",
  TRANSCRIPTION: "Full Transcription",
} as const;

export type Kind = keyof typeof exerciseLabels;
export const listeningKinds: Kind[] = ["SHORT_PODCAST", "DAILY_CONVERSATION", "TRANSCRIPTION"];
export const readingKinds: Kind[] = ["DAILY_ARTICLE", "SYNONYM_HUNTER", "CONTEXT_CLUES", "ACADEMIC_VOCABULARY"];
export const isListening = (kind: Kind) => listeningKinds.includes(kind);

export const instructions: Record<Kind, string> = {
  DAILY_ARTICLE: "Read the article and answer the questions below.",
  SYNONYM_HUNTER: "Find a word in the passage with the same meaning as the target. Select it in the passage or choose an answer.",
  CONTEXT_CLUES: "Use the surrounding words to work out what the highlighted word means.",
  ACADEMIC_VOCABULARY: "Study the word, save it to your vocabulary and mark it as reviewed or learned.",
  SHORT_PODCAST: "Listen to the episode, then answer the comprehension questions.",
  DAILY_CONVERSATION: "Listen to the speakers and answer the questions about their conversation.",
  TRANSCRIPTION: "Listen to the recording and type what you hear. Replay any section before checking your transcription.",
};
