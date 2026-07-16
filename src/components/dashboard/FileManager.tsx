"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDate, cn } from "@/lib/utils";

interface FileEntry {
  name: string;
  size: number;
  is_file: boolean;
  mimetype: string;
  modified_at: string;
}

const EDITABLE = /^(text\/|application\/(json|xml|x-yaml|javascript|toml))/;

export function FileManager({ orderId }: { orderId: string }) {
  const [dir, setDir] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ path: string; content: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (path: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/servers/${orderId}/files?dir=${encodeURIComponent(path)}`,
        );
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        const list: FileEntry[] = data.data.map(
          (d: { attributes: FileEntry }) => d.attributes,
        );
        list.sort((a, b) =>
          a.is_file === b.is_file ? a.name.localeCompare(b.name) : a.is_file ? 1 : -1,
        );
        setEntries(list);
        setDir(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      }
      setLoading(false);
    },
    [orderId],
  );

  useEffect(() => {
    load("/");
  }, [load]);

  const joinPath = (name: string) => (dir === "/" ? `/${name}` : `${dir}/${name}`);

  async function openFile(entry: FileEntry) {
    if (!EDITABLE.test(entry.mimetype) || entry.size > 1024 * 1024) {
      await downloadFile(entry);
      return;
    }
    const path = joinPath(entry.name);
    const res = await fetch(
      `/api/servers/${orderId}/file-contents?file=${encodeURIComponent(path)}`,
    );
    if (res.ok) setEditing({ path, content: await res.text() });
  }

  async function saveFile() {
    if (!editing) return;
    setSaving(true);
    await fetch(`/api/servers/${orderId}/write-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: editing.path, content: editing.content }),
    });
    setSaving(false);
    setEditing(null);
  }

  async function downloadFile(entry: FileEntry) {
    const res = await fetch(
      `/api/servers/${orderId}/download-file?file=${encodeURIComponent(joinPath(entry.name))}`,
    );
    if (res.ok) {
      const data = await res.json();
      window.open(data.attributes.url, "_blank");
    }
  }

  async function deleteEntry(entry: FileEntry) {
    if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
    await fetch(`/api/servers/${orderId}/delete-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, files: [entry.name] }),
    });
    load(dir);
  }

  async function renameEntry(entry: FileEntry) {
    const to = prompt("New name:", entry.name);
    if (!to || to === entry.name) return;
    await fetch(`/api/servers/${orderId}/rename-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, from: entry.name, to }),
    });
    load(dir);
  }

  async function newFolder() {
    const name = prompt("Folder name:");
    if (!name) return;
    await fetch(`/api/servers/${orderId}/create-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, name }),
    });
    load(dir);
  }

  const crumbs = dir.split("/").filter(Boolean);

  if (editing) {
    return (
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <span className="font-mono text-sm text-white">{editing.path}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveFile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>
        <textarea
          value={editing.content}
          onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          spellCheck={false}
          className="scrollbar-slim h-[480px] w-full resize-none bg-night p-5 font-mono text-xs leading-relaxed text-steel focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
        <nav className="flex items-center gap-1 font-mono text-sm">
          <button onClick={() => load("/")} className="text-hyper-300 hover:text-hyper-200">
            home
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-steel-faint">/</span>
              <button
                onClick={() => load("/" + crumbs.slice(0, i + 1).join("/"))}
                className={cn(
                  i === crumbs.length - 1 ? "text-white" : "text-hyper-300 hover:text-hyper-200",
                )}
              >
                {c}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={newFolder}>
            <FolderPlus className="h-4 w-4" /> New folder
          </Button>
          <Button size="sm" variant="ghost" onClick={() => load(dir)}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && <p className="px-5 py-4 text-sm text-danger">{error}</p>}

      <div className="scrollbar-slim max-h-[520px] overflow-y-auto">
        {loading && entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">Empty directory</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.name}
                  className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                >
                  <td className="w-8 py-2.5 pl-5">
                    {entry.is_file ? (
                      <FileIcon className="h-4 w-4 text-steel-faint" />
                    ) : (
                      <Folder className="h-4 w-4 text-hyper-400" />
                    )}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() =>
                        entry.is_file ? openFile(entry) : load(joinPath(entry.name))
                      }
                      className="font-medium text-steel hover:text-white"
                    >
                      {entry.name}
                    </button>
                  </td>
                  <td className="hidden py-2.5 text-xs text-steel-faint sm:table-cell">
                    {entry.is_file ? formatBytes(entry.size) : "—"}
                  </td>
                  <td className="hidden py-2.5 text-xs text-steel-faint md:table-cell">
                    {formatDate(entry.modified_at)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn title="Rename" onClick={() => renameEntry(entry)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconBtn>
                      {entry.is_file && (
                        <IconBtn title="Download" onClick={() => downloadFile(entry)}>
                          <Download className="h-3.5 w-3.5" />
                        </IconBtn>
                      )}
                      <IconBtn title="Delete" onClick={() => deleteEntry(entry)} danger>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "ring-focus rounded-md p-1.5 transition-colors",
        danger ? "text-steel-faint hover:text-danger" : "text-steel-faint hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
