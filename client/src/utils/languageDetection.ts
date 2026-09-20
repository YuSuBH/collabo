/**
 * Maps file extensions to Monaco Editor language identifiers
 * and provides icon hints for the file explorer.
 */

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.py': 'python',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.java': 'java',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.json': 'json',
  '.md': 'markdown',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.sh': 'shell',
  '.bash': 'shell',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.r': 'r',
  '.dart': 'dart',
  '.toml': 'ini',
  '.ini': 'ini',
  '.env': 'ini',
  '.txt': 'plaintext',
};

/**
 * Extract the extension from a filename (e.g. "main.js" → ".js").
 * Returns empty string if no extension is found.
 */
const getExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return fileName.slice(dotIndex).toLowerCase();
};

/**
 * Returns the Monaco language ID for a given filename.
 * Falls back to 'plaintext' for unrecognised extensions.
 */
export const getLanguageFromFileName = (fileName: string): string => {
  const ext = getExtension(fileName);
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
};

/**
 * Returns a human-readable language label for display in the status bar.
 */
export const getLanguageLabel = (fileName: string): string => {
  const lang = getLanguageFromFileName(fileName);
  const labels: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    cpp: 'C++',
    c: 'C',
    java: 'Java',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'LESS',
    json: 'JSON',
    markdown: 'Markdown',
    go: 'Go',
    rust: 'Rust',
    ruby: 'Ruby',
    php: 'PHP',
    shell: 'Shell',
    yaml: 'YAML',
    xml: 'XML',
    sql: 'SQL',
    swift: 'Swift',
    kotlin: 'Kotlin',
    lua: 'Lua',
    r: 'R',
    dart: 'Dart',
    ini: 'INI',
    plaintext: 'Plain Text',
  };
  return labels[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
};

/** Icon colour hints by file type category */
export type FileIconColor =
  | 'blue'    // TypeScript, generic code
  | 'yellow'  // JavaScript
  | 'green'   // Python
  | 'orange'  // HTML
  | 'purple'  // CSS/style
  | 'red'     // C/C++
  | 'cyan'    // Go, Rust
  | 'muted';  // Fallback

export const getFileIconColor = (fileName: string): FileIconColor => {
  const ext = getExtension(fileName);
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'blue';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'yellow';
    case '.py':
      return 'green';
    case '.html':
    case '.htm':
      return 'orange';
    case '.css':
    case '.scss':
    case '.less':
      return 'purple';
    case '.c':
    case '.cpp':
    case '.h':
    case '.hpp':
    case '.java':
      return 'red';
    case '.go':
    case '.rs':
    case '.dart':
      return 'cyan';
    default:
      return 'muted';
  }
};

/** CSS colour value for each icon colour category */
export const FILE_ICON_CSS_COLORS: Record<FileIconColor, string> = {
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  red: '#ef4444',
  cyan: '#06b6d4',
  muted: '#71717a',
};

// ─── Wandbox Execution Support ────────────────────────────────────────────────

/**
 * Maps Monaco language IDs to verified Wandbox compiler strings.
 * Only languages supported by the execution backend are listed here.
 */
const WANDBOX_COMPILER_MAP: Record<string, string> = {
  javascript: 'nodejs-20.17.0',
  typescript: 'typescript-5.6.2',
  python: 'cpython-3.12.7',
};

/**
 * Returns the Wandbox compiler string for a given filename,
 * or null if the language is not supported for execution.
 */
export const getWandboxCompiler = (fileName: string): string | null => {
  const lang = getLanguageFromFileName(fileName);
  return WANDBOX_COMPILER_MAP[lang] ?? null;
};

/**
 * Returns the Monaco language ID for execution-supported files only.
 * Returns null for non-executable file types.
 */
export const getExecutableLanguage = (fileName: string): string | null => {
  const lang = getLanguageFromFileName(fileName);
  return lang in WANDBOX_COMPILER_MAP ? lang : null;
};

/**
 * File extensions that are considered executable (used to filter
 * companion/helper files when bundling multi-file projects).
 * Keys are language IDs; values are the extensions that belong to that language.
 */
export const EXECUTABLE_EXTENSIONS_BY_LANGUAGE: Record<string, string[]> = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs', '.json'],
  typescript: ['.ts', '.tsx', '.mts', '.cts', '.json'],
  python: ['.py'],
};

/**
 * Given an entry file, returns whether a second file should be bundled
 * alongside it (i.e. it belongs to the same executable language group).
 */
export const isBundlableWith = (entryFile: string, otherFile: string): boolean => {
  const entryLang = getExecutableLanguage(entryFile);
  if (!entryLang) return false;

  // Always bundle package.json for JavaScript / TypeScript projects
  if (
    (entryLang === 'javascript' || entryLang === 'typescript') &&
    otherFile.toLowerCase() === 'package.json'
  ) {
    return true;
  }

  const otherExt = otherFile.lastIndexOf('.') > 0
    ? otherFile.slice(otherFile.lastIndexOf('.')).toLowerCase()
    : '';
  return (EXECUTABLE_EXTENSIONS_BY_LANGUAGE[entryLang] ?? []).includes(otherExt);
};

/**
 * Priority-ordered list of canonical entry-point filenames per language.
 * Used for auto-detecting the entry file in a multi-file project.
 */
export const ENTRY_FILE_PRIORITY: Record<string, string[]> = {
  javascript: ['index.js', 'main.js', 'app.js'],
  typescript: ['index.ts', 'main.ts', 'app.ts'],
  python: ['main.py', 'index.py', 'app.py'],
};
