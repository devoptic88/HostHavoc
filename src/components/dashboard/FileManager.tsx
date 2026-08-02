"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronUp,
  Download,
  File as FileIcon,
  FilePlus2,
  Folder,
  FolderPlus,
  Inbox,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatBytes, formatDate, cn } from "@/lib/utils";

interface FileEntry {
  name: string;
  size: number;
  is_file: boolean;
  mimetype: string;
  modified_at: string;
}

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const EDITABLE = /^(text\/|application\/(json|xml|x-yaml|javascript|toml))/;

export function FileManager({ orderId }: { orderId: string }) {
  const [dir, setDir] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ path: string; content: string; original: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"delete" | "refresh" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(
    async (path: string) => {
      setLoading(true);
      setError("");
      setMessage("");
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
        setSelected([]);
        setDir(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      }
      setLoading(false);
      setBusy(null);
    },
    [orderId],
  );

  useEffect(() => {
    load("/");
  }, [load]);

  const joinPath = (name: string) => (dir === "/" ? `/${name}` : `${dir}/${name}`);
  const parentDir = useMemo(() => {
    if (dir === "/") return null;
    const parts = dir.split("/").filter(Boolean);
    return parts.length <= 1 ? "/" : `/${parts.slice(0, -1).join("/")}`;
  }, [dir]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return entries;
    return entries.filter((entry) =>
      `${entry.name} ${entry.mimetype}`.toLowerCase().includes(normalizedQuery),
    );
  }, [entries, query]);

  const fileCount = entries.filter((entry) => entry.is_file).length;
  const folderCount = entries.length - fileCount;
  const totalBytes = entries.filter((entry) => entry.is_file).reduce((sum, entry) => sum + entry.size, 0);
  const allVisibleSelected = filteredEntries.length > 0 && filteredEntries.every((entry) => selected.includes(entry.name));
  const dirtyEditor = editing ? editing.content !== editing.original : false;

  function updateUploadItem(id: string, patch: Partial<UploadItem>) {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function openFile(entry: FileEntry) {
    setError("");
    setMessage("");

    if (!EDITABLE.test(entry.mimetype) || entry.size > 1024 * 1024) {
      await downloadFile(entry);
      return;
    }

    const path = joinPath(entry.name);
    const res = await fetch(
      `/api/servers/${orderId}/file-contents?file=${encodeURIComponent(path)}`,
    );
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to open file");
      return;
    }

    const content = await res.text();
    setEditing({ path, content, original: content });
  }

  async function saveFile() {
    if (!editing) return;
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/write-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: editing.path, content: editing.content }),
    });

    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to save file");
      setSaving(false);
      return;
    }

    setSaving(false);
    setMessage(`Saved ${editing.path}.`);
    setEditing(null);
    await load(dir);
  }

  async function downloadFile(entry: FileEntry) {
    const res = await fetch(
      `/api/servers/${orderId}/download-file?file=${encodeURIComponent(joinPath(entry.name))}`,
    );
    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to download file");
      return;
    }

    const data = await res.json();
    window.open(data.attributes.url, "_blank", "noopener,noreferrer");
  }

  async function deleteNames(names: string[]) {
    if (names.length === 0) return;
    setBusy("delete");
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/delete-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, files: names }),
    });

    if (!res.ok) {
      setBusy(null);
      setError((await res.json().catch(() => null))?.error ?? "Failed to delete files");
      return;
    }

    setMessage(names.length === 1 ? `Deleted ${names[0]}.` : `Deleted ${names.length} items.`);
    await load(dir);
  }

  async function deleteEntry(entry: FileEntry) {
    if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
    await deleteNames([entry.name]);
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} selected item${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    await deleteNames(selected);
  }

  async function renameEntry(entry: FileEntry) {
    const to = prompt("New name:", entry.name);
    if (!to || to === entry.name) return;
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/rename-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, from: entry.name, to }),
    });

    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to rename entry");
      return;
    }

    setMessage(`Renamed ${entry.name} to ${to}.`);
    await load(dir);
  }

  async function newFolder() {
    const name = prompt("Folder name:");
    if (!name) return;
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/create-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: dir, name }),
    });

    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to create folder");
      return;
    }

    setMessage(`Created folder ${name}.`);
    await load(dir);
  }

  async function newFile() {
    const name = prompt("File name:");
    if (!name) return;

    const path = joinPath(name);
    setError("");
    setMessage("");

    const res = await fetch(`/api/servers/${orderId}/write-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: path, content: "" }),
    });

    if (!res.ok) {
      setError((await res.json().catch(() => null))?.error ?? "Failed to create file");
      return;
    }

    setEditing({ path, content: "", original: "" });
    setMessage(`Created ${path}.`);
    await load(dir);
  }

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  async function requestUploadUrl() {
    const res = await fetch(`/api/servers/${orderId}/upload-file?dir=${encodeURIComponent("/")}`);
    if (!res.ok) {
      throw new Error((await res.json().catch(() => null))?.error ?? "Failed to prepare upload");
    }

    const data = await res.json();
    return String(data.attributes?.url ?? "");
  }

  async function uploadSingleFile(file: File, signedUrl: string, uploadId: string) {
    const formData = new FormData();
    formData.append("files", file, file.name);
    formData.append("directory", dir);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", signedUrl);

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        updateUploadItem(uploadId, {
          status: "uploading",
          progress: Math.max(1, Math.min(100, Math.round((event.loaded / event.total) * 100))),
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          updateUploadItem(uploadId, { status: "uploading", progress: 100 });
          resolve();
          return;
        }

        let nextError = `Upload failed (${xhr.status})`;
        if (xhr.responseText) {
          try {
            const parsed = JSON.parse(xhr.responseText) as { errors?: Array<{ detail?: string }> };
            nextError = parsed.errors?.[0]?.detail ?? nextError;
          } catch {
            nextError = xhr.responseText;
          }
        }
        updateUploadItem(uploadId, { status: "error", error: nextError });
        reject(new Error(nextError));
      };

      xhr.onerror = () => {
        const nextError = "Network error while uploading file";
        updateUploadItem(uploadId, { status: "error", error: nextError });
        reject(new Error(nextError));
      };

      xhr.send(formData);
    });
  }

  async function moveUploadedFileToCurrentDirectory(fileName: string) {
    if (dir === "/") return;

    const destination = dir === "/" ? fileName : `${dir.replace(/\/$/, "")}/${fileName}`;
    const res = await fetch(`/api/servers/${orderId}/rename-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        root: "/",
        from: fileName,
        to: destination,
      }),
    });

    if (!res.ok) {
      throw new Error((await res.json().catch(() => null))?.error ?? `Uploaded ${fileName}, but failed to move it into ${dir}`);
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0 || uploading) return;

    setError("");
    setMessage("");
    setUploading(true);
    setDragActive(false);

    const queuedItems: UploadItem[] = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: "queued",
    }));
    setUploadQueue(queuedItems);

    let completed = 0;
    let failed = 0;

    try {
      const signedUrl = await requestUploadUrl();
      if (!signedUrl) throw new Error("Upload endpoint was empty");

      for (const item of queuedItems) {
        const file = files.find(
          (candidate, index) =>
            `${candidate.name}-${candidate.size}-${candidate.lastModified}-${index}` === item.id,
        );
        if (!file) continue;

        try {
          await uploadSingleFile(file, signedUrl, item.id);
          await moveUploadedFileToCurrentDirectory(file.name);
          updateUploadItem(item.id, { status: "done", progress: 100 });
          completed += 1;
        } catch (err) {
          updateUploadItem(item.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
          failed += 1;
        }
      }

      if (completed > 0) {
        setMessage(
          failed > 0
            ? `Uploaded ${completed} file${completed === 1 ? "" : "s"} with ${failed} failure${failed === 1 ? "" : "s"}.`
            : `Uploaded ${completed} file${completed === 1 ? "" : "s"} to ${dir}.`,
        );
      } else if (failed > 0) {
        setError("No files were uploaded successfully.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
      await load(dir);
    }
  }

  async function handleInputUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    await uploadFiles(files);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    await uploadFiles(files);
  }

  function toggleSelected(name: string) {
    setSelected((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  function toggleSelectAll() {
    setSelected((current) =>
      allVisibleSelected ? current.filter((name) => !filteredEntries.some((entry) => entry.name === name)) : Array.from(new Set([...current, ...filteredEntries.map((entry) => entry.name)])),
    );
  }

  const crumbs = dir.split("/").filter(Boolean);

  if (editing) {
    return (
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
          <div>
            <p className="font-mono text-sm text-white">{editing.path}</p>
            <p className="text-xs text-steel-faint">
              {dirtyEditor ? "Unsaved changes" : "No local changes"}
            </p>
          </div>
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
          className="scrollbar-slim h-[540px] w-full resize-none bg-night p-5 font-mono text-xs leading-relaxed text-steel focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">File Manager</p>
            <p className="text-sm text-steel-faint">
              {folderCount} folder{folderCount === 1 ? "" : "s"}, {fileCount} file{fileCount === 1 ? "" : "s"}, {formatBytes(totalBytes)} total
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {parentDir && (
              <Button size="sm" variant="ghost" onClick={() => load(parentDir)}>
                <ChevronUp className="h-4 w-4" /> Up
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={newFile}>
              <FilePlus2 className="h-4 w-4" /> New file
            </Button>
            <Button size="sm" variant="secondary" onClick={newFolder}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
            <Button size="sm" onClick={openUploadPicker} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setBusy("refresh"); load(dir); }}>
              <RefreshCw className={cn("h-4 w-4", (loading || busy === "refresh") && "animate-spin")} />
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleInputUpload}
          className="hidden"
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <nav className="flex items-center gap-1 overflow-x-auto font-mono text-sm">
            <button onClick={() => load("/")} className="shrink-0 text-hyper-300 hover:text-hyper-200">
              home
            </button>
            {crumbs.map((crumb, index) => (
              <span key={index} className="flex shrink-0 items-center gap-1">
                <span className="text-steel-faint">/</span>
                <button
                  onClick={() => load("/" + crumbs.slice(0, index + 1).join("/"))}
                  className={cn(
                    index === crumbs.length - 1 ? "text-white" : "text-hyper-300 hover:text-hyper-200",
                  )}
                >
                  {crumb}
                </button>
              </span>
            ))}
          </nav>

          <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            <div className="px-3 text-steel-faint">
              <Search className="h-4 w-4" />
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this folder..."
              className="h-10 border-0 bg-transparent text-sm focus:border-0"
            />
          </div>
        </div>

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setDragActive(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "mt-4 rounded-2xl border border-dashed px-4 py-4 transition-colors",
            dragActive ? "border-hyper-400 bg-hyper-500/10" : "border-white/10 bg-white/[0.02]",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/[0.06] p-2.5 text-hyper-300">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Upload into {dir}</p>
                <p className="text-sm text-steel-faint">
                  Drag files here or choose files to send them straight into this folder.
                </p>
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={openUploadPicker} disabled={uploading}>
              <Upload className="h-4 w-4" /> Choose files
            </Button>
          </div>

          {uploadQueue.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/8 bg-night-100/70 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <p className="text-xs text-steel-faint">
                        {formatBytes(item.size)} · {item.status === "done" ? "Uploaded" : item.status === "error" ? item.error ?? "Failed" : item.status}
                      </p>
                    </div>
                    <span className="text-xs text-steel-faint">{item.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        item.status === "error" ? "bg-danger" : "bg-gradient-to-r from-hyper-500 to-sky-400",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {(error || message) && (
        <div className="space-y-2 border-b border-white/[0.06] px-5 py-3">
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-success">{message}</p> : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3 text-sm">
        <label className="flex items-center gap-2 text-steel">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-white/10 bg-night-100"
          />
          Select visible
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-steel-faint">
            {selected.length > 0 ? `${selected.length} selected` : `${filteredEntries.length} shown`}
          </span>
          <Button size="sm" variant="ghost" disabled={selected.length === 0 || busy !== null} onClick={deleteSelected}>
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete selected
          </Button>
        </div>
      </div>

      <div className="scrollbar-slim max-h-[560px] overflow-y-auto">
        {loading && entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">Loading...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-steel-faint">
            {entries.length === 0 ? "Empty directory" : "No files match that search"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-night-100/95 text-left text-xs uppercase tracking-[0.16em] text-steel-faint backdrop-blur">
              <tr>
                <th className="w-10 px-5 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3">Name</th>
                <th className="hidden py-3 sm:table-cell">Type</th>
                <th className="hidden py-3 md:table-cell">Size</th>
                <th className="hidden py-3 lg:table-cell">Modified</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const isSelected = selected.includes(entry.name);
                return (
                  <tr
                    key={entry.name}
                    className={cn(
                      "group border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]",
                      isSelected && "bg-hyper-500/10",
                    )}
                  >
                    <td className="px-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(entry.name)}
                        className="h-4 w-4 rounded border-white/10 bg-night-100"
                      />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        {entry.is_file ? (
                          <FileIcon className="h-4 w-4 text-steel-faint" />
                        ) : (
                          <Folder className="h-4 w-4 text-hyper-400" />
                        )}
                        <button
                          onClick={() =>
                            entry.is_file ? openFile(entry) : load(joinPath(entry.name))
                          }
                          className="text-left font-medium text-steel hover:text-white"
                        >
                          {entry.name}
                        </button>
                      </div>
                    </td>
                    <td className="hidden py-2.5 text-xs text-steel-faint sm:table-cell">
                      {entry.is_file ? entry.mimetype || "file" : "folder"}
                    </td>
                    <td className="hidden py-2.5 text-xs text-steel-faint md:table-cell">
                      {entry.is_file ? formatBytes(entry.size) : "-"}
                    </td>
                    <td className="hidden py-2.5 text-xs text-steel-faint lg:table-cell">
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
                );
              })}
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
