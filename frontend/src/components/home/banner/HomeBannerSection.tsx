'use client';

import { useEffect, useState } from 'react';
import type { Banner, BannerPosition, HomeBanners } from '@/types/banner.type';
import { getHomeBanners } from '@/services/banner.service';
import MainBannerSlider from './MainBannerSlider';
import SideBanner from './SideBanner';
import BannerSkeleton from './BannerSkeleton';
import HomeCategorySidebar from './HomeCategorySidebar';
import styles from './HomeBannerSection.module.css';

export default function HomeBannerSection() {
  const [data, setData] = useState<HomeBanners | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try { setData(await getHomeBanners(controller.signal)); setError(false); }
      catch (error) { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [retry]);
  if (!loading && !data?.mainHero.length && !error) return null;

  const slides = (position: BannerPosition, banner: Banner | null | undefined) => data?.sideSlides?.[position] ?? (banner ? [banner] : []);
  const rightSlots: { position: BannerPosition; banners: Banner[]; label: string }[] = [
    { position: 'SIDE_RIGHT_TOP', banners: slides('SIDE_RIGHT_TOP', data?.sideRightTop), label: 'Banner phải trên' },
    { position: 'SIDE_RIGHT_MIDDLE', banners: slides('SIDE_RIGHT_MIDDLE', data?.sideRightMiddle), label: 'Banner phải giữa' },
    { position: 'SIDE_RIGHT_BOTTOM', banners: slides('SIDE_RIGHT_BOTTOM', data?.sideRightBottom), label: 'Banner phải dưới' },
  ];
  const bottomSlots: { position: BannerPosition; banners: Banner[]; label: string }[] = [
    { position: 'BOTTOM_LEFT', banners: slides('BOTTOM_LEFT', data?.bottomLeft), label: 'Banner dưới trái' },
    { position: 'BOTTOM_RIGHT', banners: slides('BOTTOM_RIGHT', data?.bottomRight), label: 'Banner dưới phải' },
  ];
  const visibleRight = rightSlots.filter(item => loading || item.banners.length);
  const visibleBottom = bottomSlots.filter(item => loading || item.banners.length);
  const hasLeft = true;
  const slot = `relative min-w-0 overflow-hidden rounded-xl ${loading ? '' : 'ui-banner'}`;
  const side = (item: typeof rightSlots[number], className: string) => (
    <div key={item.position} className={`${slot} ${className}`} data-banner-position={item.position}>
      {loading ? <BannerSkeleton label={item.label} /> : <SideBanner banners={item.banners} label={item.label} />}
    </div>
  );
  return (
    <section className="container mx-auto px-3 py-5 lg:px-4 sm:py-6" aria-label="Banner khuyến mãi" aria-busy={loading}>
      <div className={`${styles.layout} ${hasLeft ? styles.hasLeft : ''} ${visibleRight.length ? styles.hasRight : ''}`}>
        {hasLeft && <HomeCategorySidebar className={styles.left} />}
        <div className={styles.mainColumn}>
          <div className={`${slot} ${styles.hero}`} data-banner-position="MAIN_HERO">
            {loading ? <BannerSkeleton label="Banner chính giữa" /> : data && <MainBannerSlider key={data.mainHero.map(banner => `${banner.id}-${banner.updatedAt}`).join(',')} banners={data.mainHero} label="Banner chính" />}
          </div>
          {!!visibleBottom.length && <div className={`${styles.bottomRow} ${visibleBottom.length === 1 ? styles.singleBottom : ''}`}>
            {visibleBottom.map(item => side(item, styles.bottomSlot))}
          </div>}
        </div>
        {!!visibleRight.length && <div className={styles.sideColumn}>{visibleRight.map(item => side(item, styles.sideSlot))}</div>}
      </div>
      {error && <p role="status" className="mt-3 text-sm text-slate-500">Chưa tải được banner. <button type="button" className="ui-link font-medium text-primary-600 hover:underline" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Thử lại</button></p>}
    </section>
  );
}
