import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as Y from 'yjs';

export interface ExtractedFile {
  name: string;
  originalPath: string;
  content: string;
  size: number;
}

export interface ZipParseResult {
  zipName: string;
  files: ExtractedFile[];
  totalFiles: number;
  skippedCount: number;
}

/**
 * Ignore system-generated files and hidden folders commonly found in ZIP archives
 */
const isIgnoredFile = (path: string): boolean => {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const fileName = segments[segments.length - 1];

  // Skip macOS metadata, DS_Store, Thumbs.db, git directories
  if (
    normalized.startsWith('__MACOSX/') ||
    fileName.startsWith('._') ||
    fileName === '.DS_Store' ||
    fileName === 'Thumbs.db' ||
    fileName === 'desktop.ini' ||
    segments.includes('.git') ||
    segments.includes('.svn')
  ) {
    return true;
  }

  return false;
};

/**
 * Sanitize a string into a clean, safe filename
 */
export const sanitizeFileName = (name: string): string => {
  // Replace invalid characters with underscores
  const cleaned = name.replace(/[^a-zA-Z0-9._\-]/g, '_');
  // Ensure it has at least a valid name
  return cleaned || 'file.txt';
};

/**
 * Export all files from the Yjs files map to a downloadable .zip archive
 */
export const exportProjectToZip = async (
  filesMap: Y.Map<Y.Text>,
  projectName: string = 'project'
): Promise<{ success: boolean; fileCount: number; fileName: string }> => {
  const zip = new JSZip();
  let count = 0;

  filesMap.forEach((yText, fileName) => {
    if (typeof fileName === 'string' && yText) {
      const content = yText.toString();
      zip.file(fileName, content);
      count++;
    }
  });

  if (count === 0) {
    throw new Error('No files found to export.');
  }

  // Generate zip binary blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const cleanProjectName = sanitizeFileName(projectName).replace(/\.zip$/i, '');
  const zipFileName = `${cleanProjectName || 'codesync-project'}.zip`;

  // Trigger browser download via file-saver
  saveAs(blob, zipFileName);

  return {
    success: true,
    fileCount: count,
    fileName: zipFileName,
  };
};

/**
 * Parse and extract all text files from a user-uploaded .zip archive,
 * flattening any nested directory structures and resolving name collisions.
 */
export const parseZipFile = async (file: File): Promise<ZipParseResult> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  const extracted: ExtractedFile[] = [];
  let skipped = 0;

  // Track used filenames to avoid collisions when flattening nested directories
  const usedNames = new Set<string>();

  const entries: Array<{ relativePath: string; zipEntry: JSZip.JSZipObject }> = [];
  loadedZip.forEach((relativePath, zipEntry) => {
    entries.push({ relativePath, zipEntry });
  });

  for (const { relativePath, zipEntry } of entries) {
    // Discard directories or ignored system metadata
    if (zipEntry.dir || isIgnoredFile(relativePath)) {
      if (zipEntry.dir) skipped++;
      continue;
    }

    try {
      // Read content as text
      const content = await zipEntry.async('text');
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const pathSegments = normalizedPath.split('/').filter(Boolean);

      // Flatten nested directory path to base filename
      let baseName = pathSegments[pathSegments.length - 1];
      baseName = sanitizeFileName(baseName);

      // If a collision occurs (e.g. src/index.js and tests/index.js), prefix with parent folder
      let finalName = baseName;
      if (usedNames.has(finalName.toLowerCase())) {
        if (pathSegments.length > 1) {
          const parentPrefix = pathSegments
            .slice(0, pathSegments.length - 1)
            .map(sanitizeFileName)
            .join('_');
          finalName = `${parentPrefix}_${baseName}`;
        }

        // If still colliding, append incremental counter
        let counter = 1;
        const nameWithoutExt = finalName.replace(/\.[^/.]+$/, '');
        const ext = finalName.includes('.') ? finalName.substring(finalName.lastIndexOf('.')) : '';
        while (usedNames.has(finalName.toLowerCase())) {
          finalName = `${nameWithoutExt}_${counter}${ext}`;
          counter++;
        }
      }

      usedNames.add(finalName.toLowerCase());

      extracted.push({
        name: finalName,
        originalPath: relativePath,
        content,
        size: content.length,
      });
    } catch (err) {
      console.warn(`[ZIP Import] Could not read file as text: ${relativePath}`, err);
      skipped++;
    }
  }

  if (extracted.length === 0) {
    throw new Error('No valid text files found in the ZIP archive.');
  }

  return {
    zipName: file.name,
    files: extracted,
    totalFiles: extracted.length,
    skippedCount: skipped,
  };
};

/**
 * Read and convert a single local file to an ExtractedFile
 */
export const readLocalTextFile = async (file: File): Promise<ExtractedFile> => {
  const content = await file.text();
  const sanitizedName = sanitizeFileName(file.name);
  return {
    name: sanitizedName,
    originalPath: file.name,
    content,
    size: file.size,
  };
};

/**
 * Populate the Yjs files map with extracted files inside a single transaction.
 */
export const importFilesToYjs = (
  doc: Y.Doc,
  files: ExtractedFile[],
  mode: 'replace' | 'merge' = 'replace'
): { importedCount: number; firstFileName: string } => {
  const filesMap = doc.getMap('files');

  doc.transact(() => {
    if (mode === 'replace') {
      // Clear all existing files
      const existingKeys = Array.from(filesMap.keys());
      existingKeys.forEach((key) => {
        filesMap.delete(key);
      });
    }

    // Set each imported file as a Y.Text
    files.forEach((file) => {
      let yText = filesMap.get(file.name) as Y.Text | undefined;
      if (yText) {
        yText.delete(0, yText.length);
        yText.insert(0, file.content);
      } else {
        yText = new Y.Text();
        yText.insert(0, file.content);
        filesMap.set(file.name, yText);
      }
    });
  });

  return {
    importedCount: files.length,
    firstFileName: files[0]?.name || 'main.js',
  };
};

/**
 * Import one or more standalone direct files into Yjs Map
 */
export const importDirectFiles = (
  doc: Y.Doc,
  files: Array<{ name: string; content: string }>,
  mode: 'merge' | 'replace' = 'merge'
): { importedCount: number; firstFileName: string; importedNames: string[] } => {
  const filesMap = doc.getMap('files');
  const importedNames: string[] = [];

  doc.transact(() => {
    if (mode === 'replace') {
      const existingKeys = Array.from(filesMap.keys());
      existingKeys.forEach((key) => filesMap.delete(key));
    }

    files.forEach((file) => {
      let yText = filesMap.get(file.name) as Y.Text | undefined;
      if (yText) {
        yText.delete(0, yText.length);
        yText.insert(0, file.content);
      } else {
        yText = new Y.Text();
        yText.insert(0, file.content);
        filesMap.set(file.name, yText);
      }
      importedNames.push(file.name);
    });
  });

  return {
    importedCount: files.length,
    firstFileName: importedNames[0] || 'main.js',
    importedNames,
  };
};
