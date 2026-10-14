'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { loadBuild } from '@/services/buildPc.service';
import { getBuildFingerprint } from '@/lib/buildPcExport';
import { useBuild } from './BuildProvider';
import type { BuildPcProduct } from '@/types/buildPc.type';

type Props = { initialCode: string };

export default function SharedBuildLoader({ initialCode }: Props) {
  const { clearAll, selectProduct, setItemQuantity, setSavedBuild } = useBuild();
  const [status, setStatus] = useState<'loading' | 'done' | 'not_found' | 'invalid' | 'error'>('loading');
  const [unavailableNames, setUnavailableNames] = useState<string[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const controller = new AbortController();

    loadBuild(initialCode, controller.signal)
      .then(res => {
        const { items, unavailable } = res.data;
        clearAll();
        for (const item of items) {
          // Build a minimal BuildPcProduct from the validate item shape
          const product: BuildPcProduct = {
            id: item.productId,
            slug: item.slug,
            sku: item.sku,
            name: item.name,
            price: item.price,
            stockQuantity: item.stockQuantity,
            inStock: item.stockQuantity > 0,
            primaryImage: item.primaryImage,
            brand: null,
            warranty: null,
          };
          selectProduct(item.slot, product);
          if (item.quantity > 1) setItemQuantity(item.slot, item.quantity);
        }
        setSavedBuild({
          fingerprint: getBuildFingerprint(items),
          shareCode: res.data.shareCode || initialCode,
        });
        setUnavailableNames(unavailable.map(u => u.productName));
        setStatus('done');
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('không hợp lệ') || msg.includes('400')) setStatus('invalid');
        else if (msg.includes('tìm thấy') || msg.includes('404')) setStatus('not_found');
        else setStatus('error');
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Loader2 size={14} className="animate-spin shrink-0" />
        Đang tải cấu hình được chia sẻ...
      </div>
    );
  }

  if (status === 'not_found' || status === 'invalid') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <AlertCircle size={14} className="shrink-0" />
        Không tìm thấy cấu hình này.
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle size={14} className="shrink-0" />
        Không thể tải cấu hình. Vui lòng thử lại sau.
      </div>
    );
  }

  // status === 'done'
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Bạn đang xem một cấu hình được chia sẻ. Chỉnh sửa rồi lưu sẽ tạo link mới, link cũ không đổi.
      </div>
      {unavailableNames.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span className="font-medium">Có {unavailableNames.length} linh kiện không còn bán:</span>{' '}
          {unavailableNames.join(', ')}
        </div>
      )}
    </div>
  );
}
