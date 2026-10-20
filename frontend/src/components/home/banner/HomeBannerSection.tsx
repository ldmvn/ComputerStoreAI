'use client';

import { useEffect, useState } from 'react';
import type { Banner, BannerPosition, HomeBanners } from '@/types/banner.type';
import { getHomeBanners } from '@/services/banner.service';
import MainBannerSlider from './MainBannerSlider';
import SideBanner from './SideBanner';
import BottomPromoBanner from './BottomPromoBanner';
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
      try {
        setData(await getHomeBanners(controller.signal));
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const refresh = () => {
      if (!document.hidden) void load();
    };
    const interval = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [retry]);

  if (!loading && !data?.mainHero.length && !error) return null;

  const slides = (position: BannerPosition, banner: Banner | null | undefined) =>
    data?.sideSlides?.[position] ?? (banner ? [banner] : []);

  // Bố cục mới theo HACOM:
  // Hàng trên: 2 banner xếp dọc bên phải (SIDE_RIGHT_TOP và SIDE_RIGHT_BOTTOM)
  const rightSlots: { position: BannerPosition; banners: Banner[]; label: string }[] = [
    { position: 'SIDE_RIGHT_TOP', banners: slides('SIDE_RIGHT_TOP', data?.sideRightTop), label: 'Banner phải trên' },
    { position: 'SIDE_RIGHT_BOTTOM', banners: slides('SIDE_RIGHT_BOTTOM', data?.sideRightBottom), label: 'Banner phải dưới' },
  ];

  // Hàng dưới: Đúng 3 banner ngang bằng nhau trải toàn bộ chiều rộng container
  const bottomSlots: { position: BannerPosition; banners: Banner[]; label: string }[] = [
    { position: 'BOTTOM_LEFT', banners: slides('BOTTOM_LEFT', data?.bottomLeft), label: 'Banner dưới trái' },
    { position: 'SIDE_RIGHT_MIDDLE', banners: slides('SIDE_RIGHT_MIDDLE', data?.sideRightMiddle), label: 'Banner dưới giữa' },
    { position: 'BOTTOM_RIGHT', banners: slides('BOTTOM_RIGHT', data?.bottomRight), label: 'Banner dưới phải' },
  ];

  const visibleRight = rightSlots.filter(item => loading || item.banners.length);
  const visibleBottom = bottomSlots.filter(item => loading || item.banners.length);
  const hasLeft = true;

  const slot = `relative min-w-0 overflow-hidden rounded-xl ${loading ? '' : 'ui-banner'}`;

  const renderSideBanner = (item: (typeof rightSlots)[number], className: string) => (
    <div key={item.position} className={`${slot} ${className}`} data-banner-position={item.position}>
      {loading ? <BannerSkeleton label={item.label} /> : <SideBanner banners={item.banners} label={item.label} />}
    </div>
  );

  return (
    <section className="container mx-auto px-3 py-5 lg:px-4 sm:py-6" aria-label="Banner khuyến mãi" aria-busy={loading}>
      {/* Hàng trên: Cột danh mục (trái) + MAIN_HERO slider (giữa) + 2 banner dọc (phải) */}
      <div className={`${styles.topRow} ${hasLeft ? styles.hasLeft : ''} ${visibleRight.length ? styles.hasRight : ''}`}>
        {hasLeft && <HomeCategorySidebar className={styles.left} />}
        <div className={styles.heroColumn}>
          <div className={`${slot} ${styles.hero}`} data-banner-position="MAIN_HERO">
            {loading ? (
              <BannerSkeleton label="Banner chính giữa" />
            ) : (
              data && (
                <MainBannerSlider
                  key={data.mainHero.map(banner => `${banner.id}-${banner.updatedAt}`).join(',')}
                  banners={data.mainHero}
                  label="Banner chính"
                />
              )
            )}
          </div>
        </div>
        {!!visibleRight.length && (
          <div className={styles.sideColumn}>
            {visibleRight.map(item => renderSideBanner(item, styles.sideSlot))}
          </div>
        )}
      </div>

      {/* Hàng dưới: Đúng 3 banner ngang bằng nhau trải toàn bộ container, có tiêu đề, mô tả và CTA */}
      {!!visibleBottom.length && (
        <div
          className={`${styles.bottomRow} ${
            visibleBottom.length === 1
              ? styles.singleBottom
              : visibleBottom.length === 2
                ? styles.doubleBottom
                : styles.tripleBottom
          }`}
        >
          {visibleBottom.map(item => {
            // Thứ tự ưu tiên nhất quán cho Tablet (768-1279px):
            // Khi đủ 3 banner, Tablet hiển thị 2 banner (BOTTOM_LEFT và BOTTOM_RIGHT);
            // SIDE_RIGHT_MIDDLE (dưới giữa) được dành cho bố cục 3 cột trên Desktop (>=1280px).
            const isDesktopOnly = item.position === 'SIDE_RIGHT_MIDDLE' && visibleBottom.length >= 3;
            return (
              <div
                key={item.position}
                className={`${slot} ${styles.bottomSlot} ${isDesktopOnly ? styles.desktopOnlySlot : ''}`}
                data-banner-position={item.position}
              >
                {loading ? (
                  <BannerSkeleton label={item.label} />
                ) : (
                  <BottomPromoBanner banners={item.banners} label={item.label} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p role="status" className="mt-3 text-sm text-slate-500">
          Chưa tải được banner.{' '}
          <button
            type="button"
            className="ui-link font-medium text-primary-600 hover:underline"
            onClick={() => {
              setLoading(true);
              setRetry(value => value + 1);
            }}
          >
            Thử lại
          </button>
        </p>
      )}
    </section>
  );
}
