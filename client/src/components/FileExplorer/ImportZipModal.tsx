import React, { useState } from "react";
import {
  Archive,
  FileCode,
  AlertTriangle,
  Layers,
  RefreshCw,
  X,
  CheckCircle2,
  FolderInput,
} from "lucide-react";
import { Button } from "../common";
import type { ZipParseResult } from "../../utils/zipUtils";
import {
  getFileIconColor,
  FILE_ICON_CSS_COLORS,
} from "../../utils/languageDetection";

interface ImportZipModalProps {
  parseResult: ZipParseResult;
  onConfirm: (mode: "replace" | "merge") => void;
  onCancel: () => void;
}

export const ImportZipModal: React.FC<ImportZipModalProps> = ({
  parseResult,
  onConfirm,
  onCancel,
}) => {
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-container zip-import-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-badge">
              <FolderInput size={18} />
            </div>
            <div>
              <h3>Import Project ZIP</h3>
              <p className="modal-subtitle">
                Extracting {parseResult.totalFiles} file
                {parseResult.totalFiles !== 1 ? "s" : ""} from{" "}
                <span className="zip-name-highlight">
                  {parseResult.zipName}
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onCancel}
            title="Close"
            aria-label="Close"
            icon={<X size={16} />}
          />
        </div>

        {/* Info notice if paths were flattened or skipped */}
        {parseResult.skippedCount > 0 && (
          <div className="zip-notice-banner">
            <AlertTriangle size={14} className="notice-icon" />
            <span>
              Directory structures are flattened to root filenames.{" "}
              {parseResult.skippedCount} folder/system item
              {parseResult.skippedCount !== 1 ? "s were" : " was"} omitted.
            </span>
          </div>
        )}

        {/* File Preview List */}
        <div className="zip-files-preview-section">
          <div className="zip-section-label">
            <span>Files to be imported ({parseResult.files.length})</span>
          </div>
          <div className="zip-files-scroll-list">
            {parseResult.files.map((file) => {
              const iconColor =
                FILE_ICON_CSS_COLORS[getFileIconColor(file.name)];
              const isFlattened = file.originalPath !== file.name;

              return (
                <div key={file.name} className="zip-file-row">
                  <div className="zip-file-left">
                    <FileCode
                      size={15}
                      className="zip-file-icon"
                      style={{ color: iconColor }}
                    />
                    <div className="zip-file-name-container">
                      <span className="zip-file-name">{file.name}</span>
                      {isFlattened && (
                        <span
                          className="zip-file-path-hint"
                          title={`Original path: ${file.originalPath}`}
                        >
                          from {file.originalPath}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="zip-file-size">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode Selector */}
        <div className="zip-mode-selector-section">
          <span className="zip-section-label">Import Strategy</span>
          <div className="zip-mode-options">
            <label
              className={`zip-mode-card ${importMode === "replace" ? "zip-mode-active" : ""}`}
              onClick={() => setImportMode("replace")}
            >
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
              />
              <div className="zip-mode-card-content">
                <div className="zip-mode-title-row">
                  <RefreshCw size={14} className="mode-card-icon" />
                  <strong>Replace Workspace</strong>
                  {importMode === "replace" && (
                    <CheckCircle2 size={15} className="mode-check-icon" />
                  )}
                </div>
                <p>
                  Clears existing files in the room and replaces them with these{" "}
                  {parseResult.files.length} files.
                </p>
              </div>
            </label>

            <label
              className={`zip-mode-card ${importMode === "merge" ? "zip-mode-active" : ""}`}
              onClick={() => setImportMode("merge")}
            >
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === "merge"}
                onChange={() => setImportMode("merge")}
              />
              <div className="zip-mode-card-content">
                <div className="zip-mode-title-row">
                  <Layers size={14} className="mode-card-icon" />
                  <strong>Merge & Overwrite</strong>
                  {importMode === "merge" && (
                    <CheckCircle2 size={15} className="mode-check-icon" />
                  )}
                </div>
                <p>
                  Keeps current files, adding these files and overwriting any
                  duplicate filenames.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <Button variant="secondary" size="md" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Archive size={15} />}
            onClick={() => onConfirm(importMode)}
          >
            Import {parseResult.files.length} File
            {parseResult.files.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
};
