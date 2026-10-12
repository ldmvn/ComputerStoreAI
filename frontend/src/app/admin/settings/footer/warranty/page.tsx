'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFeedback from '@/components/admin/AdminFeedback';
import { useAuthStore } from '@/store/auth.store';
import { usePermissionStore } from '@/store/permission.store';
import { adminGetPolicyPage, adminUpdatePolicyPage } from '@/services/contentPage.service';

// Load Tiptap editor as client-only (uses DOM APIs)
const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-slate-400 text-sm gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải trình soạn thảo…
    </div>
  ),
});

export default function WarrantyEditorPage() {
  const router   = useRouter();
  const token    = useAuthStore(s => s.token);
  const isHydrated = useAuthStore(s => s.isHydrated);
  const canManage  = usePermissionStore(s => s.has('settings', 'manage'));

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackErr, setFeedbackErr] = useState('');
  const [preview, setPreview]       = useState(false);
  const [dirty, setDirty]           = useState(false);

  const originalHtml = useRef('');

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Load content
  useEffect(() => {
    if (!isHydrated || !token) return;
    const ctrl = new AbortController();
    setLoading(true);
    adminGetPolicyPage(token, 'warranty')
      .then(res => {
        setTitle(res.data.title);
        setDescription(res.data.description ?? '');
        setContentHtml(res.data.contentHtml);
        originalHtml.current = res.data.contentHtml;
      })
      .catch(e => setFeedbackErr(e instanceof Error ? e.message : 'Tải nội dung thất bại.'))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [isHydrated, token]);

  const handleChange = useCallback((html: string) => {
    setContentHtml(html);
    setDirty(true);
    setFeedbackMsg('');
    setFeedbackErr('');
  }, []);

  const handleSave = async () => {
    if (!token || !canManage) return;
    if (!title.trim()) { setFeedbackErr('Tiêu đề không được để trống.'); return; }
    setSaving(true);
    setFeedbackMsg('');
    setFeedbackErr('');
    try {
      await adminUpdatePolicyPage(token, 'warranty', { title, description, contentHtml });
      setFeedbackMsg('Đã lưu nội dung. Trang /policy/warranty đã cập nhật.');
      setDirty(false);
      originalHtml.current = contentHtml;
    } catch (e) {
      setFeedbackErr(e instanceof Error ? e.message : 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const saveAction = canManage ? (
    <button
      onClick={handleSave}
      disabled={saving || loading}
      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Lưu
    </button>
  ) : undefined;

  return (
    <AdminGuard permission="settings:view">
      <section className="space-y-5">
        {/* Back link */}
        <Link
          href="/admin/settings/footer"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>

        <AdminPageHeader
          title="Chỉnh sửa: Chính sách bảo hành"
          action={saveAction}
        />

        <AdminFeedback message={feedbackMsg} error={feedbackErr} />

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Đang tải nội dung…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meta fields */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Tiêu đề trang</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setDirty(true); }}
                  disabled={!canManage}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Mô tả ngắn</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setDirty(true); }}
                  disabled={!canManage}
                  placeholder="Dòng mô tả hiển thị dưới tiêu đề trang"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Preview toggle */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Nội dung trang</p>
              <button
                type="button"
                onClick={() => setPreview(v => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
              >
                {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {preview ? 'Ẩn xem trước' : 'Xem trước'}
              </button>
            </div>

            {/* Editor */}
            {!preview && (
              <RichTextEditor
                content={contentHtml}
                onChange={handleChange}
                disabled={!canManage}
                minHeight={520}
              />
            )}

            {/* Preview panel */}
            {preview && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 px-3 py-1 rounded-full">Chính sách</span>
                  <h1 className="mt-3 text-2xl font-bold text-slate-900">{title || '(Chưa có tiêu đề)'}</h1>
                  {description && <p className="mt-1 text-slate-600 text-sm">{description}</p>}
                </div>
                <div
                  className="policy-preview text-sm leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
                <style>{`
                  .policy-preview h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.5em; }
                  .policy-preview h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1.2em 0 0.4em; }
                  .policy-preview p { margin: 0.4em 0; }
                  .policy-preview ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
                  .policy-preview ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
                  .policy-preview li { margin: 0.2em 0; }
                  .policy-preview blockquote { border-left: 3px solid #C4480A; padding-left: 1em; margin: 0.8em 0; color: #64748b; font-style: italic; }
                  .policy-preview a { color: #c4480a; text-decoration: underline; }
                  .policy-preview img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; }
                  .policy-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                  .policy-preview th, .policy-preview td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
                  .policy-preview th { background: #f8fafc; font-weight: 600; }
                `}</style>
              </div>
            )}

            {/* Save bar */}
            {canManage && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs text-slate-500">
                  {dirty ? '⚠ Có thay đổi chưa lưu.' : 'Nội dung đã được lưu.'}
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving || loading || !dirty}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60 transition"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu thay đổi
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </AdminGuard>
  );
}
