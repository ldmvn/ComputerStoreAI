import type { LucideIcon } from 'lucide-react';
import {
  Badge,
  BarChart2,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  History,
  Image,
  KeyRound,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PanelTop,
  Settings,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  TicketPercent,
  Truck,
  Undo2,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';

export type DashboardMenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permission key required to see this item. Omit for items visible to all admins. */
  permission?: string;
};

export type DashboardMenuGroup = {
  label: string;
  icon: LucideIcon;
  children: DashboardMenuItem[];
};

export const dashboardOverview: DashboardMenuItem = {
  label: 'Tổng quan',
  path: '/admin/dashboard',
  icon: LayoutDashboard,
  permission: 'dashboard:view',
};

export const dashboardMenu: DashboardMenuGroup[] = [
  {
    label: 'Cửa hàng',
    icon: Store,
    children: [
      { label: 'Sản phẩm',       path: '/admin/products',         icon: Package,          permission: 'products:view' },
      { label: 'Danh mục',       path: '/admin/categories',       icon: Layers,           permission: 'categories:view' },
      { label: 'Thương hiệu',    path: '/admin/brands',           icon: Badge,            permission: 'brands:view' },
      { label: 'Thuộc tính',     path: '/admin/attributes',       icon: SlidersHorizontal,permission: 'attributes:view' },
      { label: 'Mega Menu',      path: '/admin/mega-menu',        icon: PanelTop,         permission: 'megamenu:view' },
      { label: 'Kho',            path: '/admin/inventory',        icon: Warehouse,        permission: 'inventory:view' },
      { label: 'Quản lý Banner', path: '/admin/banners',          icon: Image,            permission: 'banners:view' },
      { label: 'Khối sản phẩm',  path: '/admin/product-sections', icon: PanelTop,         permission: 'product_sections:view' },
      { label: 'Khuyến mãi',     path: '/admin/promotions',       icon: TicketPercent,    permission: 'promotions:view' },
      { label: 'Đánh giá',       path: '/admin/reviews',          icon: Star,             permission: 'reviews:view' },
    ],
  },
  {
    label: 'Bán hàng',
    icon: ShoppingCart,
    children: [
      { label: 'Đơn hàng',           path: '/admin/orders',    icon: ClipboardList, permission: 'orders:view' },
      { label: 'Khách hàng',         path: '/admin/customers', icon: Users,         permission: 'customers:view' },
      { label: 'Thanh toán',         path: '/admin/payments',  icon: CreditCard, permission: 'orders:view' },
      { label: 'Vận chuyển',         path: '/admin/shipping',  icon: Truck,       permission: 'orders:manage' },
      { label: 'Đổi trả',            path: '/admin/returns',   icon: Undo2,         permission: 'returns:view' },
      { label: 'Báo cáo bán hàng',   path: '/admin/reports',         icon: BarChart2, permission: 'reports:view' },
      { label: 'Yêu cầu hỗ trợ',     path: '/admin/support-tickets',    icon: LifeBuoy,   permission: 'support:view' },
    ],
  },
  {
    label: 'Hệ thống',
    icon: Settings2,
    children: [
      { label: 'Build PC',             path: '/admin/build-pc',       icon: Wrench,      permission: 'build_pc:view' },
      { label: 'Quản trị viên',        path: '/admin/admin-users',    icon: ShieldCheck, permission: 'administrators:view' },
      { label: 'Phân quyền',           path: '/admin/roles',          icon: KeyRound,    permission: 'roles:view' },
      { label: 'Nhật ký hoạt động',    path: '/admin/activity-logs',  icon: History,     permission: 'activity_logs:view' },
    ],
  },
  {
    label: 'Cài đặt',
    icon: Settings,
    children: [
      { label: 'Thông tin cửa hàng', path: '/admin/settings/store',    icon: Store,      permission: 'settings:view' },
      { label: 'Logo / Favicon',     path: '/admin/settings/branding', icon: Image,      permission: 'settings:view' },
      { label: 'Email / Hotline',    path: '/admin/settings/contact',  icon: CreditCard, permission: 'settings:view' },
      { label: 'Cấu hình chung',     path: '/admin/settings/general',  icon: Check,      permission: 'settings:view' },
      { label: 'Quản lý trang nội dung', path: '/admin/settings/footer', icon: FileText,   permission: 'settings:view' },
    ],
  },
];

export const dashboardMenuItems = [
  dashboardOverview,
  ...dashboardMenu.flatMap((group) => group.children),
];
