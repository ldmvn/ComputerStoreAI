'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useEffect, useCallback, useState, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, RowsIcon, Columns3,
  Trash2, Undo2, Redo2, RemoveFormatting,
  ChevronDown,
} from 'lucide-react';

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition
        ${active ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}

// ── Heading dropdown ──────────────────────────────────────────────────────────

function HeadingDropdown({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);

  const options = [
    { label: 'Đoạn văn', action: () => editor?.chain().focus().setParagraph().run(), active: () => editor?.isActive('paragraph') },
    { label: 'Tiêu đề 2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor?.isActive('heading', { level: 2 }) },
    { label: 'Tiêu đề 3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: () => editor?.isActive('heading', { level: 3 }) },
    { label: 'Tiêu đề 4', action: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(), active: () => editor?.isActive('heading', { level: 4 }) },
  ];

  const current = options.find(o => o.active?.()) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="flex h-7 items-center gap-1 rounded border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        {current?.label ?? 'Đoạn văn'}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 min-w-[140px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map(o => (
            <button
              key={o.label}
              type="button"
              onMouseDown={e => { e.preventDefault(); o.action(); setOpen(false); }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-slate-50
                ${o.active?.() ? 'font-semibold text-primary-700' : 'text-slate-700'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Table menu ────────────────────────────────────────────────────────────────

function TableMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false);
  const inTable = editor?.isActive('table');

  const actions = [
    { label: 'Chèn bảng 3×3', fn: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: '─', fn: null },
    { label: 'Thêm hàng trên', fn: () => editor?.chain().focus().addRowBefore().run(), disabled: !inTable },
    { label: 'Thêm hàng dưới', fn: () => editor?.chain().focus().addRowAfter().run(), disabled: !inTable },
    { label: 'Xóa hàng hiện tại', fn: () => editor?.chain().focus().deleteRow().run(), disabled: !inTable },
    { label: '─', fn: null },
    { label: 'Thêm cột trái', fn: () => editor?.chain().focus().addColumnBefore().run(), disabled: !inTable },
    { label: 'Thêm cột phải', fn: () => editor?.chain().focus().addColumnAfter().run(), disabled: !inTable },
    { label: 'Xóa cột hiện tại', fn: () => editor?.chain().focus().deleteColumn().run(), disabled: !inTable },
    { label: '─', fn: null },
    { label: 'Xóa bảng', fn: () => editor?.chain().focus().deleteTable().run(), disabled: !inTable },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        title="Bảng"
        className={`flex h-7 items-center gap-1 rounded px-2 text-xs transition
          ${inTable ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <TableIcon className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {actions.map((a, i) =>
            a.fn === null ? (
              <hr key={i} className="my-1 border-slate-100" />
            ) : (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onMouseDown={e => { e.preventDefault(); a.fn?.(); setOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {a.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  minHeight?: number;
  height?: number;
  resizable?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({ content, onChange, disabled = false, minHeight = 500, height, resizable = false, onImageUpload }: RichTextEditorProps) {
  const onImageUploadRef = useRef(onImageUpload);
  useEffect(() => { onImageUploadRef.current = onImageUpload; }, [onImageUpload]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(height ?? null);

  const handleResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizable || contentHeight === null) return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = contentHeight;
    const onMove = (ev: PointerEvent) => {
      setContentHeight(Math.max(120, startH + ev.clientY - startY));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [resizable, contentHeight]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste(_, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        if (!imageItem || !onImageUploadRef.current) return false;
        const file = imageItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        setUploading(true);
        onImageUploadRef.current(file)
          .then(url => { editor?.chain().focus().setImage({ src: url }).run(); })
          .catch(() => {})
          .finally(() => setUploading(false));
        return true;
      },
      handleDrop(_, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        const imageFile = files.find(f => f.type.startsWith('image/'));
        if (!imageFile || !onImageUploadRef.current) return false;
        event.preventDefault();
        setUploading(true);
        onImageUploadRef.current(imageFile)
          .then(url => { editor?.chain().focus().setImage({ src: url }).run(); })
          .catch(() => {})
          .finally(() => setUploading(false));
        return true;
      },
    },
  });

  // Keep editor content in sync if parent resets
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  // only run when content prop changes from outside (not from editor itself)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, content]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập URL:', prev ?? 'https://');
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    if (!editor) return;
    if (onImageUploadRef.current && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else {
      const url = window.prompt('Nhập URL hình ảnh:');
      if (!url) return;
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImageUploadRef.current) return;
    setUploading(true);
    try {
      const url = await onImageUploadRef.current(file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch {
      // upload failed silently — user can retry
    } finally {
      setUploading(false);
    }
  }, [editor]);

  if (!editor) return (
    <div className="flex items-center justify-center py-12 text-sm text-slate-400">Đang tải trình soạn thảo…</div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      )}
      {/* ── Toolbar ── */}
      <div className={`flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>

        <HeadingDropdown editor={editor} />
        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Đậm (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Nghiêng (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Gạch chân (Ctrl+U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Gạch ngang">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Căn trái">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Căn giữa">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Căn phải">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Danh sách đầu dòng">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Danh sách đánh số">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Trích dẫn">
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        <ToolBtn onClick={insertLink} active={editor.isActive('link')} title="Chèn/sửa liên kết">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={insertImage} title={onImageUpload ? 'Chèn hình ảnh (tải lên)' : 'Chèn hình ảnh (URL)'}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        <TableMenu editor={editor} />
        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Xóa định dạng">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Hoàn tác (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Làm lại (Ctrl+Y)">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <style>{`
        .rte-content .ProseMirror {
          outline: none;
          min-height: ${contentHeight !== null ? '100%' : `${minHeight}px`};
          padding: 20px 24px;
          font-size: 14px;
          line-height: 1.7;
          color: #334155;
        }
        .rte-content .ProseMirror h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.6em; }
        .rte-content .ProseMirror h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.2em 0 0.5em; }
        .rte-content .ProseMirror h4 { font-size: 0.925rem; font-weight: 600; color: #334155; margin: 1em 0 0.4em; }
        .rte-content .ProseMirror p { margin: 0.4em 0; }
        .rte-content .ProseMirror ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
        .rte-content .ProseMirror ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
        .rte-content .ProseMirror li { margin: 0.2em 0; }
        .rte-content .ProseMirror blockquote { border-left: 3px solid #C4480A; padding-left: 1em; margin: 0.8em 0; color: #64748b; font-style: italic; }
        .rte-content .ProseMirror a { color: #c4480a; text-decoration: underline; }
        .rte-content .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; }
        .rte-content .ProseMirror table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 1em 0; }
        .rte-content .ProseMirror th,
        .rte-content .ProseMirror td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; vertical-align: top; min-width: 60px; word-break: break-word; }
        .rte-content .ProseMirror th { background: #f8fafc; font-weight: 600; }
        .rte-content .ProseMirror .selectedCell:after { z-index: 2; position: absolute; content: ""; left: 0; right: 0; top: 0; bottom: 0; background: rgba(196,72,10,.08); pointer-events: none; }
        .rte-content .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: -2px; width: 4px; background-color: #C4480A; pointer-events: none; }
        .rte-content .ProseMirror p.is-empty::before { content: attr(data-placeholder); float: left; color: #94a3b8; pointer-events: none; height: 0; }
      `}</style>

      <div
        className="rte-content relative"
        style={contentHeight !== null ? { height: contentHeight, overflowY: 'auto' } : undefined}
      >
        <EditorContent editor={editor} />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="text-sm text-slate-500">Đang tải ảnh…</span>
          </div>
        )}
      </div>

      {resizable && contentHeight !== null && (
        <div
          onPointerDown={handleResizeStart}
          className="flex h-4 cursor-row-resize select-none items-center justify-center border-t border-slate-100 bg-slate-50"
          aria-label="Kéo để thay đổi chiều cao editor"
          role="separator"
        >
          <span className="flex gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="block h-1 w-1 rounded-full bg-slate-300" />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
