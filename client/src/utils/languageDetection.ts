/**
 * Maps file extensions to Monaco Editor language identifiers
 * and provides icon hints for the file explorer.
 */

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
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
      return 'blue';
    case '.js':
    case '.jsx':
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
