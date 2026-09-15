import { useRef } from "react";
import { useAtlas } from "../state/AtlasContext";
import { useToast } from "../components/Toast";
import { downloadAtlas } from "../features/portability/exportAtlas";
import { readAndImport } from "../features/portability/importAtlas";
import { getSampleAtlas, isSamplePalace } from "../features/sample/sample";

export function Settings() {
  const { atlas, replaceAtlas } = useAtlas();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadAtlas(atlas);
    showToast("Atlas exported.");
  };

  const handleImportPick = () => fileRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readAndImport(file);
    if (result.ok) {
      replaceAtlas(result.atlas);
      showToast("Atlas imported.");
    } else {
      showToast(result.message, "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <main className="container">
      <div className="page-head">
        <h1>Settings and data</h1>
      </div>

      <section className="settings-section">
        <h2>Your atlas file</h2>
        <p>Keep a copy you own. One file holds every palace and its history.</p>
        <div className="settings-actions">
          <button className="btn btn--primary" onClick={handleExport}>
            Export atlas
          </button>
          <button className="btn btn--secondary" onClick={handleImportPick}>
            Import atlas
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            aria-label="Choose an atlas file to import"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>Sample atlas</h2>
        <p>See the overview with real content, then clear it when you are ready.</p>
        <div className="settings-actions">
          <button
            className="btn btn--secondary"
            onClick={() => {
              replaceAtlas(getSampleAtlas());
              showToast("Sample loaded.");
            }}
          >
            Load the sample
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              replaceAtlas({
                ...atlas,
                palaces: atlas.palaces.filter((p) => !isSamplePalace(p.id)),
              });
              showToast("Sample removed.");
            }}
          >
            Remove sample
          </button>
        </div>
      </section>
    </main>
  );
}
