import { DragEvent, useMemo, useState } from "react";
import { ErrorDropdown } from "./components/ErrorDropdown";
import { FilteredDropdown } from "./components/FilteredDropdown";
import { UploadAfter } from "./components/UploadAfter";
import { UploadBefore } from "./components/UploadBefore";
import type { DeliveryDocument, FilteredItem, ParseError, UploadFile } from "./types";
import {
  getUploadFilesFromDrop,
  groupDeliveryDocuments,
  isExcelFile,
  parseDeliveryDocument,
} from "./utils/excel";

type DuplicateCandidate = {
  fileName: string;
  relativePath: string;
  fileSize: number;
  matches: string[];
};

type PendingDuplicateUpload = {
  files: UploadFile[];
  candidates: DuplicateCandidate[];
};

const defaultExcludedDestinations = [
  "국립중앙도서관(신문)",
  "국립중앙도서관(잡지)",
  "해동경제연구원 일본신문 납품서 양식",
];
const excludedDestinationsStorageKey = "excel-summary:excluded-destinations";

export function DeliveryPage() {
  const [documents, setDocuments] = useState<DeliveryDocument[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [filteredItems, setFilteredItems] = useState<FilteredItem[]>([]);
  const [excludedDestinations, setExcludedDestinations] = useState<string[]>(
    readExcludedDestinations,
  );
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDuplicateUpload, setPendingDuplicateUpload] =
    useState<PendingDuplicateUpload | null>(null);

  const deliveryGroups = useMemo(
    () => groupDeliveryDocuments(documents),
    [documents],
  );
  const hasUploadedFiles = deliveryGroups.length > 0;

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = await getUploadFilesFromDrop(event.dataTransfer);

    if (files.length === 0) {
      return;
    }

    const duplicateCandidates = findDuplicateCandidates(files, documents);

    if (duplicateCandidates.length > 0) {
      setPendingDuplicateUpload({
        files,
        candidates: duplicateCandidates,
      });
      return;
    }

    await parseUploadFiles(files);
  };

  const parseUploadFiles = async (files: UploadFile[]) => {
    const nextFilteredItems: FilteredItem[] = [];
    const excelFiles = files
      .filter(({ file }) => isExcelFile(file))
      .filter((uploadFile) =>
        !isExcludedByPath(uploadFile, excludedDestinations, nextFilteredItems),
      );

    if (excelFiles.length === 0) {
      if (nextFilteredItems.length > 0) {
        setFilteredItems((current) => [...current, ...nextFilteredItems]);
        return;
      }

      setErrors((current) => [
        ...current,
        {
          id: `no-excel-${crypto.randomUUID()}`,
          fileName: "업로드 항목",
          message:
            "읽을 수 있는 엑셀 파일(.xlsx, .xls, .csv)을 찾지 못했습니다.",
        },
      ]);
      return;
    }

    setIsReading(true);
    const parsedDocuments: DeliveryDocument[] = [];
    const parseErrors: ParseError[] = [];

    await Promise.all(
      excelFiles.map(async (uploadFile) => {
        try {
          const document = await parseDeliveryDocument(uploadFile);
          const filteredDocument = applyFilters(document, excludedDestinations, nextFilteredItems);

          if (filteredDocument) {
            parsedDocuments.push(filteredDocument);
          }
        } catch (error) {
          parseErrors.push({
            id: `${uploadFile.relativePath}-${uploadFile.file.lastModified}-error`,
            fileName: uploadFile.relativePath,
            message:
              error instanceof Error
                ? error.message
                : "파일을 읽는 중 오류가 발생했습니다.",
          });
        }
      }),
    );

    setDocuments((current) => [...current, ...parsedDocuments]);
    setErrors((current) => [...current, ...parseErrors]);
    setFilteredItems((current) => [...current, ...nextFilteredItems]);
    setIsReading(false);
  };

  const handleReset = () => {
    setDocuments([]);
    setErrors([]);
    setFilteredItems([]);
    setIsDragging(false);
    setPendingDuplicateUpload(null);
  };

  const handleAddExcludedDestination = (destination: string) => {
    const normalizedDestination = normalizeDestination(destination);

    if (!normalizedDestination) {
      return;
    }

    setExcludedDestinations((current) =>
      persistExcludedDestinations([...new Set([...current, normalizedDestination])]),
    );
  };

  const handleRemoveExcludedDestination = (destination: string) => {
    setExcludedDestinations((current) =>
      persistExcludedDestinations(current.filter((item) => item !== destination)),
    );
  };

  return (
    <main
      className={`app-shell ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      {isReading && (
        <div
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-label="파일 읽는 중"
        >
          <div className="loading-spinner" aria-hidden="true" />
        </div>
      )}

      {pendingDuplicateUpload && (
        <DuplicateWarningModal
          candidates={pendingDuplicateUpload.candidates}
          onCancel={() => setPendingDuplicateUpload(null)}
          onConfirm={() => {
            const files = pendingDuplicateUpload.files;
            setPendingDuplicateUpload(null);
            void parseUploadFiles(files);
          }}
        />
      )}

      <ErrorDropdown errors={errors} />
      <FilteredDropdown items={filteredItems} />

      {!hasUploadedFiles ? (
        <UploadBefore
          excludedDestinations={excludedDestinations}
          onAddExcludedDestination={handleAddExcludedDestination}
          onRemoveExcludedDestination={handleRemoveExcludedDestination}
        />
      ) : (
        <UploadAfter groups={deliveryGroups} onReset={handleReset} />
      )}
    </main>
  );
}

function DuplicateWarningModal({
  candidates,
  onCancel,
  onConfirm,
}: {
  candidates: DuplicateCandidate[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="duplicate-modal"
        role="dialog"
        aria-modal="true"
        aria-label="중복 의심 파일 확인"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>중복 의심 파일이 있습니다</h2>
            <p>백업본으로 보이는 파일명이 있어 확인이 필요합니다.</p>
          </div>
        </header>

        <div className="duplicate-list">
          {candidates.map((candidate) => (
            <div className="duplicate-item" key={`${candidate.relativePath}-${candidate.fileSize}`}>
              <div className="duplicate-row">
                <span className="duplicate-label">파일</span>
                <div>
                  <strong>{candidate.fileName}</strong>
                  <span>{candidate.relativePath}</span>
                </div>
              </div>
              <div className="duplicate-row suspicious">
                <span className="duplicate-label">의심되는 파일</span>
                <div>
                  {candidate.matches.map((match) => (
                    <span key={match}>{match}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="preview-button" type="button" onClick={onCancel}>
            취소
          </button>
          <button className="download-button" type="button" onClick={onConfirm}>
            그래도 업로드
          </button>
        </div>
      </section>
    </div>
  );
}

function applyFilters(
  document: DeliveryDocument,
  excludedDestinations: string[],
  filteredItems: FilteredItem[],
) {
  const excludedDestinationSet = new Set(excludedDestinations.map(normalizeDestination));

  if (excludedDestinationSet.has(normalizeDestination(document.destinationName))) {
    filteredItems.push({
      id: `${document.id}-excluded-destination`,
      fileName: document.fileName,
      relativePath: document.relativePath,
      reason: `미포함 납품처: ${document.destinationName}`,
    });
    return null;
  }

  const filteredRows = document.items.filter((item) => !item.note.includes("석간"));

  if (filteredRows.length === 0) {
    return null;
  }

  return {
    ...document,
    items: filteredRows,
  };
}

function isExcludedByPath(
  uploadFile: UploadFile,
  excludedDestinations: string[],
  filteredItems: FilteredItem[],
) {
  const normalizedPath = normalizeDestination(uploadFile.relativePath);
  const matchedDestination = excludedDestinations
    .map(normalizeDestination)
    .find((destination) => destination && normalizedPath.includes(destination));

  if (!matchedDestination) {
    return false;
  }

  filteredItems.push({
    id: `${uploadFile.relativePath}-${uploadFile.file.lastModified}-path-filter`,
    fileName: uploadFile.file.name,
    relativePath: uploadFile.relativePath,
    reason: `미포함 파일명/경로: ${matchedDestination}`,
  });

  return true;
}

function readExcludedDestinations() {
  if (typeof window === "undefined") {
    return defaultExcludedDestinations;
  }

  try {
    const storedValue = window.localStorage.getItem(excludedDestinationsStorageKey);
    const parsedValue = storedValue ? JSON.parse(storedValue) : null;

    if (Array.isArray(parsedValue)) {
      return mergeWithDefaultExcludedDestinations(
        parsedValue.map(String).map(normalizeDestination).filter(Boolean),
      );
    }
  } catch {
    return defaultExcludedDestinations;
  }

  return defaultExcludedDestinations;
}

function persistExcludedDestinations(destinations: string[]) {
  const normalizedDestinations = destinations.map(normalizeDestination).filter(Boolean);

  window.localStorage.setItem(
    excludedDestinationsStorageKey,
    JSON.stringify(normalizedDestinations),
  );

  return normalizedDestinations;
}

function mergeWithDefaultExcludedDestinations(destinations: string[]) {
  return [...new Set([...defaultExcludedDestinations.map(normalizeDestination), ...destinations])];
}

function normalizeDestination(destination: string) {
  return destination.normalize("NFC").replace(/\s+/g, "").trim();
}

function findDuplicateCandidates(
  files: UploadFile[],
  existingDocuments: DeliveryDocument[],
): DuplicateCandidate[] {
  const excelFiles = files.filter(({ file }) => isExcelFile(file));
  const seenFiles = new Map<string, { displayName: string; path: string }[]>();
  const candidates: DuplicateCandidate[] = [];

  for (const document of existingDocuments) {
    const key = buildBackupCandidateKey(document.fileName);
    const current = seenFiles.get(key) ?? [];
    current.push({ displayName: document.fileName, path: document.relativePath });
    seenFiles.set(key, current);
  }

  for (const uploadFile of excelFiles) {
    const key = buildBackupCandidateKey(uploadFile.file.name);
    const matches = seenFiles.get(key) ?? [];
    const backupLike = isBackupLikeFileName(uploadFile.file.name);
    const matchingBackups = matches.filter((match) => isBackupLikeFileName(match.displayName));

    if ((backupLike && matches.length > 0) || matchingBackups.length > 0) {
      candidates.push({
        fileName: uploadFile.file.name,
        relativePath: uploadFile.relativePath,
        fileSize: uploadFile.file.size,
        matches: matches.map((match) => match.path),
      });
    }

    seenFiles.set(key, [
      ...matches,
      { displayName: uploadFile.file.name, path: uploadFile.relativePath },
    ]);
  }

  return candidates;
}

function buildBackupCandidateKey(fileName: string) {
  const normalizedName = normalizeFileNameBase(fileName)
    .replace(/\bversion\s*\d+\b/g, "")
    .replace(/\bv\s*\d+\b/g, "")
    .replace(/\bcopy\s*\d*\b/g, "")
    .replace(/복사본\d*/g, "")
    .replace(/\(\d+\)$/g, "")
    .replace(/\[\d+\]$/g, "")
    .replace(/[\s_\-().[\]]/g, "");

  return normalizedName;
}

function isBackupLikeFileName(fileName: string) {
  const normalizedName = normalizeFileNameBase(fileName);

  return (
    /\bversion\s*\d+\b/.test(normalizedName) ||
    /\bv\s*\d+\b/.test(normalizedName) ||
    /\bcopy\s*\d*\b/.test(normalizedName) ||
    /복사본\d*/.test(normalizedName) ||
    /\(\d+\)$/.test(normalizedName) ||
    /\[\d+\]$/.test(normalizedName)
  );
}

function normalizeFileNameBase(fileName: string) {
  return fileName
    .normalize("NFC")
    .toLowerCase()
    .replace(/\.(xlsx|xls|csv)$/i, "");
}
