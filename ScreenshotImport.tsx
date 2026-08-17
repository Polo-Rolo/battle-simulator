import { useEffect, useState } from 'react';
import { parseStatSheet, type ParsedStat, type Scope } from '../ocr/statSheet';
import { recognizeText } from '../ocr/recognize';

const SCOPE_LABELS: Record<Scope, string> = {
  all: 'All troops',
  infantry: 'Infantry',
  cavalry: 'Cavalry',
  archer: 'Archers',
};

interface Candidate extends ParsedStat {
  key: string;
  include: boolean;
}

function toCandidates(text: string): { candidates: Candidate[]; unread: string[] } {
  const sheet = parseStatSheet(text);
  return {
    candidates: sheet.stats.map((stat, index) => ({ ...stat, key: `${index}`, include: true })),
    unread: sheet.unread,
  };
}

/**
 * Reads stat percentages off an in-game screenshot so a loadout does not have to be typed in. OCR is
 * never trustworthy on game fonts, so nothing is applied until the numbers have been reviewed. Values
 * land in the stat grid, which stays the single source of truth.
 */
export function ScreenshotImport(props: { sideLabel: string; onImport: (stats: ParsedStat[]) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [unread, setUnread] = useState<string[]>([]);
  const [showText, setShowText] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const readText = (value: string) => {
    setText(value);
    const { candidates: parsed, unread: skipped } = toCandidates(value);
    setCandidates(parsed);
    setUnread(skipped);
    setShowText(true);
    if (parsed.length === 0) setError('No troop stats found in that image - check the raw text below.');
  };

  const run = async (file: Blob) => {
    setError(null);
    setCandidates([]);
    setUnread([]);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setStatus('Loading OCR engine\u2026');
    try {
      const recognized = await recognizeText(file, (stage, progress) =>
        setStatus(`${stage} ${Math.round(progress * 100)}%`),
      );
      readText(recognized);
    } catch (cause) {
      setError(`OCR failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setStatus(null);
    }
  };

  // Screenshots usually arrive on the clipboard, so paste anywhere while this panel is open.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.type.startsWith('image/'))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void run(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const included = candidates.filter((candidate) => candidate.include);

  return (
    <div className="ocr-import">
      <div
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) void run(file);
        }}
      >
        <p>Drop or paste a stat-screen screenshot</p>
        <input
          type="file"
          accept="image/*"
          aria-label={`Stat screenshot for ${props.sideLabel}`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void run(file);
          }}
        />
        <p className="note">
          Everything runs in this browser - the image is never uploaded. The engine and English model are downloaded
          once from a CDN on first use.
        </p>
      </div>

      {status ? <p className="note">{status}</p> : null}
      {error ? <p className="warn">{error}</p> : null}
      {preview ? <img className="ocr-preview" src={preview} alt="Imported screenshot" /> : null}

      {candidates.length > 0 ? (
        <>
          <p className="note">
            Check every number against the screenshot before applying - OCR misreads game fonts often, especially 0/8
            and 1/7.
          </p>
          <table className="bonus-table">
            <thead>
              <tr>
                <th>Use</th>
                <th>Applies to</th>
                <th>Stat</th>
                <th>Read as</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, index) => (
                <tr key={candidate.key}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Use ${candidate.scope} ${candidate.stat}`}
                      checked={candidate.include}
                      onChange={(event) => {
                        const next = [...candidates];
                        next[index] = { ...candidate, include: event.target.checked };
                        setCandidates(next);
                      }}
                    />
                  </td>
                  <td>
                    <select
                      value={candidate.scope}
                      aria-label={`Scope for ${candidate.stat}`}
                      onChange={(event) => {
                        const next = [...candidates];
                        next[index] = { ...candidate, scope: event.target.value as Scope };
                        setCandidates(next);
                      }}
                    >
                      {(Object.keys(SCOPE_LABELS) as Scope[]).map((scope) => (
                        <option key={scope} value={scope}>
                          {SCOPE_LABELS[scope]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{candidate.stat}</td>
                  <td>
                    <input
                      type="number"
                      aria-label={`${candidate.scope} ${candidate.stat} value`}
                      value={candidate.value}
                      onChange={(event) => {
                        const next = [...candidates];
                        next[index] = { ...candidate, value: Number(event.target.value) || 0 };
                        setCandidates(next);
                      }}
                    />
                  </td>
                  <td className="muted">{candidate.raw}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {unread.length > 0 ? (
            <p className="note">
              Ignored {unread.length} line(s) with a percentage but no troop stat: {unread.slice(0, 3).join(' \u00b7 ')}
            </p>
          ) : null}
          <div className="row">
            <button
              type="button"
              disabled={included.length === 0}
              onClick={() => {
                props.onImport(included.map(({ scope, stat, value, raw }) => ({ scope, stat, value, raw })));
                setCandidates([]);
                setUnread([]);
                setPreview((current) => {
                  if (current) URL.revokeObjectURL(current);
                  return null;
                });
              }}
            >
              Apply {included.length} value(s) to {props.sideLabel}
            </button>
          </div>
        </>
      ) : null}

      <button type="button" className="ghost" onClick={() => setShowText((value) => !value)}>
        {showText ? 'Hide' : 'Show'} raw text
      </button>
      {showText ? (
        <>
          <textarea
            className="ocr-text"
            aria-label="OCR text"
            rows={6}
            value={text}
            placeholder="OCR output appears here; you can also paste or fix text and re-read it."
            onChange={(event) => setText(event.target.value)}
          />
          <button type="button" onClick={() => readText(text)}>
            Re-read text
          </button>
        </>
      ) : null}
    </div>
  );
}
