import type { Sound, Level, Stage, PhonicsAPI, G2PAPI } from "./types/phonics";
import type { GrammarStage } from "./types/grammar";
import type { VocabCoreAPI, VocabDataset } from "./types/vocab";
import type {
  AppState,
  SpeechAPI,
  QuoteAPI,
  DictionaryShard,
} from "./types/app";
declare global {
  interface Window {
    SOUNDS: Record<string, Sound>;
    LEVELS: Level[];
    STAGES: Stage[];
    GRAMMAR: GrammarStage[];
    Phonics: PhonicsAPI;
    G2P: G2PAPI;
    Speech: SpeechAPI;
    DailyQuote: QuoteAPI;
    App: AppState;
    VocabCore: VocabCoreAPI;
    VOCAB_CORE?: VocabDataset;
    IPA: Record<string, string>;
    AUDIO_MANIFEST: { p: Record<string, string>; t: Record<string, string> };
    DICT_INDEX?: string;
    DICT_SHARD: (key: string, shard: DictionaryShard) => void;
  }
  const STAGES: Window["STAGES"];
  const GRAMMAR: Window["GRAMMAR"];
  const SOUNDS: Window["SOUNDS"];
  const VocabCore: Window["VocabCore"];
  const Speech: Window["Speech"];
  const Phonics: Window["Phonics"];
}
export {};
