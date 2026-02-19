import type { Difficulty } from "./types";

/** ~200 most common English words for typing tests */
export const easyWords: string[] = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
  "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
  "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
  "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
  "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "great", "between", "need", "large", "under", "never", "city", "home", "order", "long",
  "hand", "high", "old", "place", "same", "keep", "help", "every", "start", "show",
  "here", "life", "world", "still", "own", "point", "form", "each", "line", "right",
  "move", "thing", "turn", "ask", "late", "run", "small", "name", "house", "part",
  "while", "play", "next", "must", "might", "much", "head", "end", "through", "last",
  "live", "state", "since", "left", "school", "more", "both", "found", "change", "off",
  "does", "learn", "such", "should", "number", "side", "been", "real", "find", "before",
  "few", "read", "where", "case", "little", "call", "why", "set", "try", "put",
  "too", "man", "child", "again", "kind", "went", "many", "around", "write", "word",
  "close", "sure", "let", "light", "far", "begin", "got", "being", "open", "bring",
];

/** Backward-compat alias */
export const commonWords = easyWords;

/** ~200 medium-difficulty words (5-8 char avg) */
export const mediumWords: string[] = [
  "process", "require", "between", "system", "company", "problem", "service",
  "against", "during", "without", "program", "include", "another", "however",
  "provide", "history", "country", "million", "general", "through", "already",
  "believe", "nothing", "example", "picture", "several", "suggest", "support",
  "control", "perhaps", "produce", "protect", "certain", "culture", "current",
  "develop", "discuss", "economy", "outside", "reading", "teacher", "tonight",
  "society", "concern", "present", "natural", "popular", "measure", "forward",
  "pattern", "morning", "central", "private", "quality", "quickly", "realize",
  "careful", "compare", "chapter", "contain", "surface", "trouble", "whether",
  "advance", "complex", "connect", "deliver", "digital", "explain", "fashion",
  "feature", "fiction", "finance", "foreign", "fortune", "growing", "highway",
  "imagine", "kitchen", "library", "machine", "message", "mission", "monitor",
  "network", "opinion", "package", "parking", "patient", "percent", "perfect",
  "physics", "plastic", "premier", "primary", "promise", "purpose", "quarter",
  "receipt", "reflect", "release", "replace", "request", "respond", "revenue",
  "routine", "section", "serious", "station", "storage", "strange", "student",
  "success", "surface", "therapy", "thought", "traffic", "trouble", "variety",
  "version", "village", "visible", "weather", "weekend", "welcome", "western",
  "combine", "comfort", "command", "comment", "conduct", "confirm", "council",
  "counter", "defense", "display", "distant", "element", "emotion", "evening",
  "fashion", "fitness", "freedom", "habitat", "journey", "justice", "lasting",
  "leather", "lecture", "limited", "logical", "loyalty", "manager", "married",
  "massive", "medical", "meeting", "mention", "mineral", "miracle", "mixture",
  "musical", "mystery", "neutral", "passage", "payment", "penalty", "pension",
  "pioneer", "planner", "pleased", "poverty", "predict", "prepare", "prevent",
  "printer", "product", "profile", "project", "publish", "railway", "recover",
  "regular", "reserve", "resolve", "shelter", "silence", "skilled", "soldier",
  "survive", "virtual", "warning", "writing", "balance", "capable", "climate",
];

/** ~200 hard words (uncommon/complex) */
export const hardWords: string[] = [
  "algorithm", "ephemeral", "ubiquitous", "paradigm", "ambiguous", "resilient",
  "meticulous", "pragmatic", "eloquent", "arbitrary", "perpetual", "synthesis",
  "anomalous", "benchmark", "cognitive", "consensus", "divergent", "elaborate",
  "formulate", "harmonize", "implement", "juxtapose", "kinematic", "labyrinth",
  "magnitude", "negotiate", "objective", "paradoxical", "quintuple", "reconcile",
  "sovereign", "threshold", "undermine", "vindicate", "whimsical", "xylophone",
  "zealously", "aberration", "benevolent", "capitalize", "deliberate", "exquisite",
  "fabricate", "gratitude", "hierarchy", "illustrate", "jeopardize", "kaleidoscope",
  "legitimate", "manipulate", "nostalgic", "obligation", "peripheral", "quarantine",
  "rhetorical", "supplement", "trajectory", "unanimous", "vulnerable", "wilderness",
  "accentuate", "bureaucracy", "catastrophe", "derivative", "extrapolate", "fluorescent",
  "gregarious", "hypothesis", "idempotent", "jurisprudence", "clandestine", "nonchalant",
  "ostentatious", "prerequisite", "quintessential", "reciprocate", "synchronize",
  "transcendent", "unequivocal", "vivacious", "ambivalent", "bureaucratic", "combustible",
  "dexterity", "eccentricity", "phenomenon", "philanthropy", "polynomial", "melancholy",
  "serendipity", "therapeutic", "meticulous", "conundrum", "dichotomy", "equilibrium",
  "fastidious", "grotesque", "hegemony", "idiosyncrasy", "juxtaposition", "laborious",
  "metamorphosis", "nefarious", "obstinate", "perseverance", "querulous", "rudimentary",
  "surreptitious", "temperament", "ubiquity", "venerable", "acquiesce", "cacophony",
  "ebullient", "fallacious", "impervious", "magnanimous", "obfuscate", "perfunctory",
  "recalcitrant", "sycophant", "tumultuous", "acrimonious", "belligerent", "circumvent",
  "dilapidated", "effervescent", "intransigent", "misanthrope", "pernicious", "recapitulate",
  "superfluous", "unilateral", "vociferous", "capricious", "duplicitous", "ignominious",
  "loquacious", "nomenclature", "panacea", "sanguine", "tenacious", "visceral",
  "anachronism", "convivial", "exacerbate", "facetious", "gratuitous", "incongruous",
  "litigious", "ostentatious", "propensity", "repudiate", "soliloquy", "torpid",
  "unmitigated", "verisimilitude", "antithesis", "compendium", "disparate", "elucidate",
  "frivolous", "harangue", "inscrutable", "luminescent", "obsequious", "precipitous",
  "remunerate", "spurious", "tantamount", "unorthodox", "cavernous", "deleterious",
  "exonerate", "garrulous", "incandescent", "magniloquent", "obstreperous", "perspicacious",
  "reverberate", "surreptitious", "ubiquitous", "variegated", "ameliorate", "capitulate",
  "delineate", "extemporaneous", "grandiloquent", "idiosyncratic", "nomenclature",
];

/** Lookup word pool by difficulty */
export const wordPoolByDifficulty: Record<Difficulty, string[]> = {
  easy: easyWords,
  medium: mediumWords,
  hard: hardWords,
};
