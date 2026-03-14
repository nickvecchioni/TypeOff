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
  { language: "javascript", name: "Retry", code: `async function retry(fn, attempts = 3) {\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (i === attempts - 1) throw err;\n    }\n  }\n}` },
  { language: "javascript", name: "Pipe", code: `const pipe = (...fns) => (x) => {\n  return fns.reduce((acc, fn) => fn(acc), x);\n};` },
  { language: "javascript", name: "Chunk Array", code: `function chunk(arr, size) {\n  const chunks = [];\n  for (let i = 0; i < arr.length; i += size) {\n    chunks.push(arr.slice(i, i + size));\n  }\n  return chunks;\n}` },
  { language: "javascript", name: "Unique Array", code: `function unique(arr) {\n  return [...new Set(arr)];\n}` },
  { language: "javascript", name: "Observable", code: `class Observable {\n  constructor() { this.subscribers = []; }\n  subscribe(fn) {\n    this.subscribers.push(fn);\n    return () => {\n      this.subscribers = this.subscribers.filter(s => s !== fn);\n    };\n  }\n  notify(data) {\n    this.subscribers.forEach(fn => fn(data));\n  }\n}` },
  { language: "javascript", name: "Curry", code: `function curry(fn) {\n  return function curried(...args) {\n    if (args.length >= fn.length) {\n      return fn.apply(this, args);\n    }\n    return (...more) => curried(...args, ...more);\n  };\n}` },
  { language: "javascript", name: "LRU Cache", code: `class LRUCache {\n  constructor(max) {\n    this.max = max;\n    this.cache = new Map();\n  }\n  get(key) {\n    const val = this.cache.get(key);\n    if (val === undefined) return undefined;\n    this.cache.delete(key);\n    this.cache.set(key, val);\n    return val;\n  }\n  set(key, val) {\n    this.cache.delete(key);\n    this.cache.set(key, val);\n    if (this.cache.size > this.max) {\n      this.cache.delete(this.cache.keys().next().value);\n    }\n  }\n}` },
  { language: "javascript", name: "Rate Limiter", code: `function rateLimit(fn, limit, interval) {\n  const queue = [];\n  let count = 0;\n  setInterval(() => { count = 0; }, interval);\n  return (...args) => {\n    if (count < limit) {\n      count++;\n      return fn(...args);\n    }\n  };\n}` },
  { language: "javascript", name: "Promise Pool", code: `async function promisePool(tasks, concurrency) {\n  const results = [];\n  const executing = new Set();\n  for (const task of tasks) {\n    const p = task().then(r => {\n      executing.delete(p);\n      return r;\n    });\n    executing.add(p);\n    results.push(p);\n    if (executing.size >= concurrency) {\n      await Promise.race(executing);\n    }\n  }\n  return Promise.all(results);\n}` },

  // ─── Python ─────────────────────────────────────────────
  { language: "python", name: "Binary Search", code: `def binary_search(arr, target):\n    lo, hi = 0, len(arr) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1` },
  { language: "python", name: "Flatten List", code: `def flatten(lst):\n    result = []\n    for item in lst:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result` },
  { language: "python", name: "LRU Cache", code: `class LRUCache:\n    def __init__(self, capacity):\n        self.cache = {}\n        self.capacity = capacity\n        self.order = []\n\n    def get(self, key):\n        if key in self.cache:\n            self.order.remove(key)\n            self.order.append(key)\n            return self.cache[key]\n        return -1` },
  { language: "python", name: "Merge Sort", code: `def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)` },
  { language: "python", name: "Fibonacci", code: `def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a` },
  { language: "python", name: "Retry Decorator", code: `from functools import wraps\n\ndef retry(max_attempts=3):\n    def decorator(fn):\n        @wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(max_attempts):\n                try:\n                    return fn(*args, **kwargs)\n                except Exception as e:\n                    if attempt == max_attempts - 1:\n                        raise e\n        return wrapper\n    return decorator` },
  { language: "python", name: "Chunk List", code: `def chunk(lst, size):\n    return [lst[i:i + size] for i in range(0, len(lst), size)]` },
  { language: "python", name: "Stack", code: `class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, item):\n        self.items.append(item)\n\n    def pop(self):\n        if not self.items:\n            raise IndexError("pop from empty stack")\n        return self.items.pop()` },
  { language: "python", name: "Quick Sort", code: `def quick_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quick_sort(left) + middle + quick_sort(right)` },
  { language: "python", name: "Memoize", code: `def memoize(fn):\n    cache = {}\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = fn(*args)\n        return cache[args]\n    return wrapper` },
  { language: "python", name: "Matrix Transpose", code: `def transpose(matrix):\n    rows = len(matrix)\n    cols = len(matrix[0])\n    return [[matrix[r][c] for r in range(rows)] for c in range(cols)]` },
  { language: "python", name: "Trie", code: `class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nclass Trie:\n    def __init__(self):\n        self.root = TrieNode()\n\n    def insert(self, word):\n        node = self.root\n        for ch in word:\n            if ch not in node.children:\n                node.children[ch] = TrieNode()\n            node = node.children[ch]\n        node.is_end = True` },
  { language: "python", name: "Rate Limiter", code: `import time\n\nclass RateLimiter:\n    def __init__(self, max_calls, period):\n        self.max_calls = max_calls\n        self.period = period\n        self.calls = []\n\n    def allow(self):\n        now = time.time()\n        self.calls = [t for t in self.calls if now - t < self.period]\n        if len(self.calls) < self.max_calls:\n            self.calls.append(now)\n            return True\n        return False` },
  { language: "python", name: "Context Manager", code: `class Timer:\n    def __enter__(self):\n        self.start = time.perf_counter()\n        return self\n\n    def __exit__(self, *args):\n        self.elapsed = time.perf_counter() - self.start` },
  { language: "python", name: "Linked List", code: `class Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head):\n    prev = None\n    curr = head\n    while curr:\n        nxt = curr.next\n        curr.next = prev\n        prev = curr\n        curr = nxt\n    return prev` },
  { language: "python", name: "Topological Sort", code: `def topo_sort(graph):\n    visited = set()\n    result = []\n\n    def dfs(node):\n        if node in visited:\n            return\n        visited.add(node)\n        for neighbor in graph.get(node, []):\n            dfs(neighbor)\n        result.append(node)\n\n    for node in graph:\n        dfs(node)\n    return result[::-1]` },

  // ─── Go ─────────────────────────────────────────────────
  { language: "go", name: "Contains", code: `func contains(s []string, target string) bool {\n    for _, v := range s {\n        if v == target {\n            return true\n        }\n    }\n    return false\n}` },
  { language: "go", name: "Reverse String", code: `func reverseString(s string) string {\n    runes := []rune(s)\n    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {\n        runes[i], runes[j] = runes[j], runes[i]\n    }\n    return string(runes)\n}` },
  { language: "go", name: "Generic Filter", code: `func filter[T any](s []T, fn func(T) bool) []T {\n    var result []T\n    for _, v := range s {\n        if fn(v) {\n            result = append(result, v)\n        }\n    }\n    return result\n}` },
  { language: "go", name: "Max Int", code: `func maxInt(a, b int) int {\n    if a > b {\n        return a\n    }\n    return b\n}` },
  { language: "go", name: "Thread-Safe Cache", code: `type Cache struct {\n    mu    sync.RWMutex\n    items map[string]interface{}\n}\n\nfunc (c *Cache) Get(key string) (interface{}, bool) {\n    c.mu.RLock()\n    defer c.mu.RUnlock()\n    val, ok := c.items[key]\n    return val, ok\n}` },
  { language: "go", name: "Unique Slice", code: `func unique(s []int) []int {\n    seen := make(map[int]bool)\n    result := []int{}\n    for _, v := range s {\n        if !seen[v] {\n            seen[v] = true\n            result = append(result, v)\n        }\n    }\n    return result\n}` },
  { language: "go", name: "Merge Maps", code: `func mergeMaps(a, b map[string]int) map[string]int {\n    result := make(map[string]int)\n    for k, v := range a {\n        result[k] = v\n    }\n    for k, v := range b {\n        result[k] = v\n    }\n    return result\n}` },
  { language: "go", name: "Worker Pool", code: `func workerPool(jobs <-chan int, results chan<- int, workers int) {\n    var wg sync.WaitGroup\n    for i := 0; i < workers; i++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            for job := range jobs {\n                results <- job * 2\n            }\n        }()\n    }\n    wg.Wait()\n    close(results)\n}` },
  { language: "go", name: "Binary Search", code: `func binarySearch(arr []int, target int) int {\n    lo, hi := 0, len(arr)-1\n    for lo <= hi {\n        mid := lo + (hi-lo)/2\n        if arr[mid] == target {\n            return mid\n        } else if arr[mid] < target {\n            lo = mid + 1\n        } else {\n            hi = mid - 1\n        }\n    }\n    return -1\n}` },
  { language: "go", name: "Linked List", code: `type Node struct {\n    Val  int\n    Next *Node\n}\n\nfunc reverseList(head *Node) *Node {\n    var prev *Node\n    curr := head\n    for curr != nil {\n        next := curr.Next\n        curr.Next = prev\n        prev = curr\n        curr = next\n    }\n    return prev\n}` },
  { language: "go", name: "Stack", code: `type Stack[T any] struct {\n    items []T\n}\n\nfunc (s *Stack[T]) Push(item T) {\n    s.items = append(s.items, item)\n}\n\nfunc (s *Stack[T]) Pop() (T, bool) {\n    if len(s.items) == 0 {\n        var zero T\n        return zero, false\n    }\n    item := s.items[len(s.items)-1]\n    s.items = s.items[:len(s.items)-1]\n    return item, true\n}` },
  { language: "go", name: "Rate Limiter", code: `type RateLimiter struct {\n    mu       sync.Mutex\n    tokens   int\n    max      int\n    interval time.Duration\n}\n\nfunc (rl *RateLimiter) Allow() bool {\n    rl.mu.Lock()\n    defer rl.mu.Unlock()\n    if rl.tokens > 0 {\n        rl.tokens--\n        return true\n    }\n    return false\n}` },
  { language: "go", name: "Map Reduce", code: `func mapReduce[T, U any](items []T, mapper func(T) U, reducer func(U, U) U) U {\n    results := make([]U, len(items))\n    for i, item := range items {\n        results[i] = mapper(item)\n    }\n    acc := results[0]\n    for _, r := range results[1:] {\n        acc = reducer(acc, r)\n    }\n    return acc\n}` },

  // ─── Rust ───────────────────────────────────────────────
  { language: "rust", name: "Fibonacci", code: `fn fibonacci(n: u32) -> u64 {\n    let (mut a, mut b) = (0u64, 1u64);\n    for _ in 0..n {\n        let temp = b;\n        b = a + b;\n        a = temp;\n    }\n    a\n}` },
  { language: "rust", name: "Binary Search", code: `fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {\n    let mut lo = 0;\n    let mut hi = arr.len();\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        match arr[mid].cmp(target) {\n            Ordering::Equal => return Some(mid),\n            Ordering::Less => lo = mid + 1,\n            Ordering::Greater => hi = mid,\n        }\n    }\n    None\n}` },
  { language: "rust", name: "Stack", code: `impl<T> Stack<T> {\n    fn new() -> Self {\n        Stack { items: Vec::new() }\n    }\n    fn push(&mut self, item: T) {\n        self.items.push(item);\n    }\n    fn pop(&mut self) -> Option<T> {\n        self.items.pop()\n    }\n}` },
  { language: "rust", name: "Flatten", code: `fn flatten<T: Clone>(nested: &[Vec<T>]) -> Vec<T> {\n    nested.iter().flat_map(|v| v.clone()).collect()\n}` },
  { language: "rust", name: "Word Count", code: `fn count_words(text: &str) -> HashMap<&str, usize> {\n    let mut counts = HashMap::new();\n    for word in text.split_whitespace() {\n        *counts.entry(word).or_insert(0) += 1;\n    }\n    counts\n}` },
  { language: "rust", name: "Linked List", code: `enum List<T> {\n    Cons(T, Box<List<T>>),\n    Nil,\n}\n\nimpl<T> List<T> {\n    fn new() -> Self {\n        List::Nil\n    }\n    fn push(self, val: T) -> Self {\n        List::Cons(val, Box::new(self))\n    }\n}` },
  { language: "rust", name: "Iterator Sum", code: `fn sum_evens(nums: &[i32]) -> i32 {\n    nums.iter()\n        .filter(|&&n| n % 2 == 0)\n        .sum()\n}` },
  { language: "rust", name: "Merge Sorted", code: `fn merge_sorted(a: &[i32], b: &[i32]) -> Vec<i32> {\n    let mut result = Vec::with_capacity(a.len() + b.len());\n    let (mut i, mut j) = (0, 0);\n    while i < a.len() && j < b.len() {\n        if a[i] <= b[j] {\n            result.push(a[i]);\n            i += 1;\n        } else {\n            result.push(b[j]);\n            j += 1;\n        }\n    }\n    result.extend_from_slice(&a[i..]);\n    result.extend_from_slice(&b[j..]);\n    result\n}` },
  { language: "rust", name: "Rate Limiter", code: `struct RateLimiter {\n    tokens: u32,\n    max_tokens: u32,\n    last_refill: Instant,\n    interval: Duration,\n}\n\nimpl RateLimiter {\n    fn allow(&mut self) -> bool {\n        self.refill();\n        if self.tokens > 0 {\n            self.tokens -= 1;\n            true\n        } else {\n            false\n        }\n    }\n}` },
  { language: "rust", name: "Generic Cache", code: `use std::collections::HashMap;\n\nstruct Cache<K, V> {\n    store: HashMap<K, V>,\n    capacity: usize,\n}\n\nimpl<K: Eq + Hash, V> Cache<K, V> {\n    fn new(capacity: usize) -> Self {\n        Cache {\n            store: HashMap::new(),\n            capacity,\n        }\n    }\n    fn get(&self, key: &K) -> Option<&V> {\n        self.store.get(key)\n    }\n    fn insert(&mut self, key: K, val: V) {\n        if self.store.len() >= self.capacity {\n            return;\n        }\n        self.store.insert(key, val);\n    }\n}` },
  { language: "rust", name: "Matrix Multiply", code: `fn mat_mul(a: &Vec<Vec<f64>>, b: &Vec<Vec<f64>>) -> Vec<Vec<f64>> {\n    let rows = a.len();\n    let cols = b[0].len();\n    let inner = b.len();\n    let mut result = vec![vec![0.0; cols]; rows];\n    for i in 0..rows {\n        for j in 0..cols {\n            for k in 0..inner {\n                result[i][j] += a[i][k] * b[k][j];\n            }\n        }\n    }\n    result\n}` },

  // ─── Java ───────────────────────────────────────────────
  { language: "java", name: "Generic Filter", code: `public static <T> List<T> filter(List<T> list, Predicate<T> pred) {\n    List<T> result = new ArrayList<>();\n    for (T item : list) {\n        if (pred.test(item)) {\n            result.add(item);\n        }\n    }\n    return result;\n}` },
  { language: "java", name: "Binary Search", code: `public static int binarySearch(int[] arr, int target) {\n    int lo = 0, hi = arr.length - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}` },
  { language: "java", name: "Generic Pair", code: `public class Pair<A, B> {\n    private final A first;\n    private final B second;\n\n    public Pair(A first, B second) {\n        this.first = first;\n        this.second = second;\n    }\n\n    public A getFirst() { return first; }\n    public B getSecond() { return second; }\n}` },
  { language: "java", name: "Reverse String", code: `public static String reverse(String s) {\n    StringBuilder sb = new StringBuilder(s);\n    return sb.reverse().toString();\n}` },
  { language: "java", name: "Array Swap", code: `public static <T> void swap(T[] arr, int i, int j) {\n    T temp = arr[i];\n    arr[i] = arr[j];\n    arr[j] = temp;\n}` },
  { language: "java", name: "Word Count", code: `public static Map<String, Integer> wordCount(String text) {\n    Map<String, Integer> counts = new HashMap<>();\n    for (String word : text.split("\\\\s+")) {\n        counts.merge(word, 1, Integer::sum);\n    }\n    return counts;\n}` },
  { language: "java", name: "Palindrome Check", code: `public static boolean isPalindrome(String s) {\n    int left = 0, right = s.length() - 1;\n    while (left < right) {\n        if (s.charAt(left) != s.charAt(right)) return false;\n        left++;\n        right--;\n    }\n    return true;\n}` },
  { language: "java", name: "GCD", code: `public static int gcd(int a, int b) {\n    while (b != 0) {\n        int temp = b;\n        b = a % b;\n        a = temp;\n    }\n    return a;\n}` },
  { language: "java", name: "Singleton", code: `public class Singleton {\n    private static volatile Singleton instance;\n    private Singleton() {}\n\n    public static Singleton getInstance() {\n        if (instance == null) {\n            synchronized (Singleton.class) {\n                if (instance == null) {\n                    instance = new Singleton();\n                }\n            }\n        }\n        return instance;\n    }\n}` },
  { language: "java", name: "Stack", code: `public class Stack<T> {\n    private List<T> items = new ArrayList<>();\n\n    public void push(T item) {\n        items.add(item);\n    }\n\n    public T pop() {\n        if (items.isEmpty()) throw new EmptyStackException();\n        return items.remove(items.size() - 1);\n    }\n\n    public T peek() {\n        if (items.isEmpty()) throw new EmptyStackException();\n        return items.get(items.size() - 1);\n    }\n}` },
  { language: "java", name: "Merge Sort", code: `public static void mergeSort(int[] arr, int left, int right) {\n    if (left < right) {\n        int mid = left + (right - left) / 2;\n        mergeSort(arr, left, mid);\n        mergeSort(arr, mid + 1, right);\n        merge(arr, left, mid, right);\n    }\n}` },
  { language: "java", name: "Stream Collect", code: `public static Map<String, List<Person>> groupByCity(List<Person> people) {\n    return people.stream()\n        .collect(Collectors.groupingBy(Person::getCity));\n}` },
  { language: "java", name: "LRU Cache", code: `public class LRUCache<K, V> extends LinkedHashMap<K, V> {\n    private final int capacity;\n\n    public LRUCache(int capacity) {\n        super(capacity, 0.75f, true);\n        this.capacity = capacity;\n    }\n\n    @Override\n    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {\n        return size() > capacity;\n    }\n}` },
  { language: "java", name: "Builder Pattern", code: `public class User {\n    private final String name;\n    private final int age;\n\n    private User(Builder builder) {\n        this.name = builder.name;\n        this.age = builder.age;\n    }\n\n    public static class Builder {\n        private String name;\n        private int age;\n\n        public Builder name(String name) {\n            this.name = name;\n            return this;\n        }\n        public Builder age(int age) {\n            this.age = age;\n            return this;\n        }\n        public User build() {\n            return new User(this);\n        }\n    }\n}` },
  { language: "java", name: "Linked List", code: `public class LinkedList<T> {\n    private Node<T> head;\n\n    private static class Node<T> {\n        T data;\n        Node<T> next;\n        Node(T data) { this.data = data; }\n    }\n\n    public void addFirst(T data) {\n        Node<T> node = new Node<>(data);\n        node.next = head;\n        head = node;\n    }\n}` },
];

const LANGUAGES = ["javascript", "python", "go", "rust", "java"] as const;
export type CodeLanguage = (typeof LANGUAGES)[number];
export const CODE_LANGUAGES = LANGUAGES;

/**
 * Convert code string into typeable word tokens.
 * Preserves indentation as space characters (or tabs) and newlines as `\n` tokens.
 */
export function tokenizeCode(snippet: string, indentStyle: "spaces" | "tabs" = "spaces"): string[] {
  const lines = snippet.split("\n");
  const tokens: string[] = [];

  // Detect the base indent width (smallest non-zero indent) for tab conversion
  let baseIndent = Infinity;
  if (indentStyle === "tabs") {
    for (const line of lines) {
      const stripped = line.replace(/^\s+/, "");
      const indent = line.length - stripped.length;
      if (indent > 0 && indent < baseIndent) {
        baseIndent = indent;
      }
    }
    if (!isFinite(baseIndent)) baseIndent = 2;
  }

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (lineIdx > 0) {
      tokens.push("\\n"); // newline token
    }

    // Count leading spaces — emit as a single indent token
    const stripped = line.replace(/^\s+/, "");
    const indent = line.length - stripped.length;
    if (indent > 0) {
      if (indentStyle === "tabs") {
        const tabCount = Math.max(1, Math.round(indent / baseIndent));
        tokens.push("\t".repeat(tabCount));
      } else {
        tokens.push(" ".repeat(indent));
      }
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

/** Normalize a seed to a stable code snippet index for PB tracking */
export function normalizeCodeSeed(seed: number, language?: string): number {
  const pool = language
    ? CODE_SNIPPETS.filter((s) => s.language === language)
    : CODE_SNIPPETS;
  if (pool.length === 0) return 0;
  const rng = mulberry32(seed);
  return Math.floor(rng() * pool.length);
}

/**
 * Get a code snippet by its normalized index (from normalizeCodeSeed).
 * Use this in results screens where the seed has already been normalized.
 */
export function getCodeSnippetByIndex(index: number, language?: string): CodeSnippet {
  const pool = language
    ? CODE_SNIPPETS.filter((s) => s.language === language)
    : CODE_SNIPPETS;
  if (pool.length === 0) return CODE_SNIPPETS[0];
  return pool[index % pool.length];
}

/** Get all available languages */
export function getCodeLanguages(): string[] {
  return [...LANGUAGES];
}
