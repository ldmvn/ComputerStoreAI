const DEFAULT_MASCOT_SRC = '/assets/support-widget/mascot-avatar.png';

// Nhân vật linh vật dùng chung cho nút nổi và mục "Chatbot AI" trong panel.
// `src` cho phép Dashboard ghi đè bằng Avatar do Admin tải lên; rỗng/undefined
// thì dùng ảnh nhân vật mặc định đã chốt.
export default function MascotAvatar({ src, className = '' }: { src?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || DEFAULT_MASCOT_SRC} alt="" className={`h-full w-full object-cover ${className}`} />;
}
