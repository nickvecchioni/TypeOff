import { mulberry32 } from "./prng";

export interface CodeSnippet {
  code: string;
  language: string;
  name: string;
}

const CODE_SNIPPETS: CodeSnippet[] = [
  // ─── JavaScript ─────────────────────────────────────────
  { language: "javascript", name: "Debounce", code: `function debounce(fn, ms) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}` },
  { language: "javascript", name: "Flatten Array", code: `const flatten = (arr) => {\n  return arr.reduce((acc, val) => {\n    return acc.concat(Array.isArray(val) ? flatten(val) : val);\n  }, []);\n};` },
  { language: "javascript", name: "Fetch JSON", code: `async function fetchJSON(url) {\n  const res = await fetch(url);\n  if (!res.ok) throw new Error(res.statusText);\n  return res.json();\n}` },
  { language: "javascript", name: "Deep Clone", code: `function deepClone(obj) {\n  if (obj === null || typeof obj !== "object") return obj;\n  const clone = Array.isArray(obj) ? [] : {};\n  for (const key in obj) clone[key] = deepClone(obj[key]);\n  return clone;\n}` },
  { language: "javascript", name: "Event Emitter", code: `class EventEmitter {\n  constructor() { this.events = {}; }\n  on(event, fn) {\n    (this.events[event] ||= []).push(fn);\n  }\n  emit(event, ...args) {\n    (this.events[event] || []).forEach(fn => fn(...args));\n  }\n}` },
  { language: "javascript", name: "Throttle", code: `function throttle(fn, limit) {\n  let last = 0;\n  return (...args) => {\n    const now = Date.now();\n    if (now - last >= limit) {\n      last = now;\n      return fn(...args);\n    }\n  };\n}` },
  { language: "javascript", name: "Memoize", code: `const memoize = (fn) => {\n  const cache = new Map();\n  return (...args) => {\n    const key = JSON.stringify(args);\n    if (cache.has(key)) return cache.get(key);\n    const result = fn(...args);\n    cache.set(key, result);\n    return result;\n  };\n};` },
  { language: "javascript", name: "Group By", code: `function groupBy(arr, key) {\n  return arr.reduce((groups, item) => {\n    const val = item[key];\n    (groups[val] ||= []).push(item);\n    return groups;\n  }, {});\n}` },

  // ─── Python ─────────────────────────────────────────────
  { language: "python", name: "Binary Search", code: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1` },
  { language: "python", name: "Flatten List", code: `def flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result` },
  { language: "python", name: "LRU Cache", code: `class LRUCache:\n    def __init__(self, capacity):\n        self.cache = {}\n        self.capacity = capacity\n        self.order = []\n\n    def get(self, key):\n        if key in self.cache:\n            self.order.remove(key)\n            self.order.append(key)\n            return self.cache[key]\n        return -1` },
  { language: "python", name: "Merge Sort", code: `def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)` },
  { language: "python", name: "Fibonacci", code: `def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a` },
  { language: "python", name: "Retry Decorator", code: `from functools import wraps\n\ndef retry(max_attempts=3):\n    def decorator(fn):\n        @wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(max_attempts):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception as e:\n                    if attempt == max_attempts - 1:\n                        raise e\n        return wrapper\n    return decorator` },
  { language: "python", name: "Chunk List", code: `def chunk(lst, size):\n    return [lst[i:i + size] for i in range(0, len(lst), size)]` },
  { language: "python", name: "Stack", code: `class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, item):\n        self.items.append(item)\n\n    def pop(self):\n        if not self.items:\n            raise IndexError("pop from empty stack")\n        return self.items.pop()` },

  // ─── Go ─────────────────────────────────────────────────
  { language: "go", name: "Contains", code: `func contains(s []string, target string) bool {\n    for _, v := range s {\n        if v == target {\n            return true\n        }\n    }\n    return false\n}` },
  { language: "go", name: "Reverse String", code: `func reverseString(s string) string {\n    runes := []rune(s)\n    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {\n        runes[i], runes[j] = runes[j], runes[i]\n    }\n    return string(runes)\n}` },
  { language: "go", name: "Generic Filter", code: `func filter[T any](s []T, fn func(T) bool) []T {\n    var result []T\n    for _, v := range s {\n        if fn(v) {\n            result = append(result, v)\n        }\n    }\n    return result\n}` },
  { language: "go", name: "Max Int", code: `func maxInt(a, b int) int {\n    if a > b {\n        return a\n    }\n    return b\n}` },
  { language: "go", name: "Thread-Safe Cache", code: `type Cache struct {\n    mu    sync.RWMutex\n    items map[string]interface{}\n}\n\nfunc (c *Cache) Get(key string) (interface{}, bool) {\n    c.mu.RLock()\n    defer c.mu.RUnlock()\n    val, ok := c.items[key]\n    return val, ok\n}` },
  { language: "go", name: "Unique Slice", code: `func unique(s []int) []int {\n    seen := make(map[int]bool)\n    result := []int{}\n    for _, v := range s {\n        if !seen[v] {\n            seen[v] = true\n            result = append(result, v)\n        }\n    }\n    return result\n}` },

  // ─── Rust ───────────────────────────────────────────────
  { language: "rust", name: "Fibonacci", code: `fn fibonacci(n: u32) -> u64 {\n    let (mut a, mut b) = (0u64, 1u64);\n    for _ in 0..n {\n        let temp = b;\n        b = a + b;\n        a = temp;\n    }\n    a\n}` },
  { language: "rust", name: "Binary Search", code: `fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {\n    let mut lo = 0;\n    let mut hi = arr.len();\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        match arr[mid].cmp(target) {\n            Ordering::Equal => return Some(mid),\n            Ordering::Less => lo = mid + 1,\n            Ordering::Greater => hi = mid,\n        }\n    }\n    None\n}` },
  { language: "rust", name: "Stack", code: `impl<T> Stack<T> {\n    fn new() -> Self {\n        Stack { items: Vec::new() }\n    }\n    fn push(&mut self, item: T) {\n        self.items.push(item);\n    }\n    fn pop(&mut self) -> Option<T> {\n        self.items.pop()\n    }\n}` },
  { language: "rust", name: "Flatten", code: `fn flatten<T: Clone>(nested: &[Vec<T>]) -> Vec<T> {\n    nested.iter().flat_map(|v| v.clone()).collect()\n}` },
  { language: "rust", name: "Word Count", code: `fn count_words(text: &str) -> HashMap<&str, usize> {\n    let mut counts = HashMap::new();\n    for word in text.split_whitespace() {\n        *counts.entry(word).or_insert(0) += 1;\n    }\n    counts\n}` },

  // ─── Java ───────────────────────────────────────────────
  { language: "java", name: "Generic Filter", code: `public static <T> List<T> filter(List<T> list, Predicate<T> pred) {\n    List<T> result = new ArrayList<>();\n    for (T item : list) {\n        if (pred.test(item)) {\n            result.add(item);\n        }\n    }\n    return result;\n}` },
  { language: "java", name: "Binary Search", code: `public static int binarySearch(int[] arr, int target) {\n    int lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}` },
  { language: "java", name: "Generic Pair", code: `public class Pair<A, B> {\n    private final A first;\n    private final B second;\n\n    public Pair(A first, B second) {\n        this.first = first;\n        this.second = second;\n    }\n\n    public A getFirst() { return first; }\n    public B getSecond() { return second; }\n}` },
  { language: "java", name: "Reverse String", code: `public static String reverse(String s) {\n    StringBuilder sb = new StringBuilder(s);\n    return sb.reverse().toString();\n}` },
  { language: "java", name: "Array Swap", code: `public static <T> void swap(T[] arr, int i, int j) {\n    T temp = arr[i];\n    arr[i] = arr[j];\n    arr[j] = temp;\n}` },
  { language: "java", name: "Word Count", code: `public static Map<String, Integer> wordCount(String text) {\n    Map<String, Integer> counts = new HashMap<>();\n    for (String word : text.split("\\\\s+")) {\n        counts.merge(word, 1, Integer::sum);\n    }\n    return counts;\n}` },
  { language: "java", name: "Palindrome Check", code: `public static boolean isPalindrome(String s) {\n    int left = 0, right = s.length() - 1;\n    while (left < right) {\n        if (s.charAt(left) != s.charAt(right)) return false;\n        left++;\n        right--;\n    }\n    return true;\n}` },
  { language: "java", name: "GCD", code: `public static int gcd(int a, int b) {\n    while (b != 0) {\n        int temp = b;\n        b = a % b;\n        a = temp;\n    }\n    return a;\n}` },
];

const LANGUAGES = ["javascript", "python", "go", "rust", "java"] as const;
export type CodeLanguage = (typeof LANGUAGES)[number];
export const CODE_LANGUAGES = LANGUAGES;

/**
 * Convert code string into typeable word tokens.
 * Preserves indentation as space characters and newlines as `\n` tokens.
 */
export function tokenizeCode(snippet: string): string[] {
  const lines = snippet.split("\n");
  const tokens: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (lineIdx > 0) {
      tokens.push("\\n"); // newline token
    }

    // Count leading spaces — emit as a single indent token
    const stripped = line.replace(/^\s+/, "");
    const indent = line.length - stripped.length;
    if (indent > 0) {
      tokens.push(" ".repeat(indent));
    }

    // Split remaining code into tokens on whitespace
    const parts = stripped.split(/\s+/).filter(Boolean);
    tokens.push(...parts);
  }

  return tokens;
}

/**
 * Get a code snippet for a given seed, optionally filtered by language.
 */
export function getCodeSnippet(seed: number, language?: string): CodeSnippet {
  const pool = language
    ? CODE_SNIPPETS.filter((s) => s.language === language)
    : CODE_SNIPPETS;

  if (pool.length === 0) {
    return CODE_SNIPPETS[0]; // fallback
  }

  const rng = mulberry32(seed);
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

/** Get all available languages */
export function getCodeLanguages(): string[] {
  return [...LANGUAGES];
}
