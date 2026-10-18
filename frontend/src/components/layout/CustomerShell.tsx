import Header from './Header';
import Footer from './Footer';
import FloatingSupportWidget from './support-widget/FloatingSupportWidget';
import CategoryHeroBackdrop from './CategoryHeroBackdrop';

export default function CustomerShell({ children, contentClassName = 'flex-1', fillViewport = true, compactFooter = false }: {
  children: React.ReactNode;
  contentClassName?: string;
  fillViewport?: boolean;
  compactFooter?: boolean;
}) {
  return (
    <div className={`flex flex-col ${fillViewport ? 'min-h-screen' : ''}`}>
      <Header />
      <CategoryHeroBackdrop />
      <main className={contentClassName}>{children}</main>
      <Footer compact={compactFooter} />
      <FloatingSupportWidget />
    </div>
  );
}
