# DUCMANH PC

Website bán máy tính trực tuyến tích hợp trợ lý ảo AI
## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js (ES Modules) |
| Database | MySQL + Prisma ORM |
| Auth | JWT, Google OAuth 2.0, SMTP reset mật khẩu |
| Payment | VNPay, MoMo, VietQR/SePay |
| AI | Claude (Anthropic) / Gemini / DeepSeek — pluggable provider |
| Rich Text | Tiptap |

## Chức năng nổi bật

- Danh mục sản phẩm, tìm kiếm, lọc đa tiêu chí, mega menu
- Giỏ hàng, Wishlist, so sánh sản phẩm
- Checkout, quản lý đơn hàng, đổi/trả hàng
- Thanh toán VNPay / MoMo / chuyển khoản VietQR (tự động xác nhận qua SePay)
- Đăng nhập email + Google OAuth, đặt lại mật khẩu qua email
- **Build PC** — chọn linh kiện từng bước, kiểm tra tương thích, lưu cấu hình
- **Trợ lý AI** — chat tư vấn sản phẩm, RAG trên catalog
- Đánh giá sản phẩm (chỉ người đã mua), khuyến mãi & voucher
- Support ticket, thông báo Telegram
- Admin Dashboard — sản phẩm, đơn hàng, khách hàng, báo cáo, cài đặt thương hiệu

## Cấu trúc project

```text
ComputerStoreAI/
├── frontend/          # Next.js 14 App Router
│   └── src/
│       ├── app/       # Pages & API routes
│       ├── components/
│       └── services/
├── backend/           # Express.js API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── ai/        # AI provider abstraction
│   │   └── payments/  # VNPay / MoMo / SePay
│   ├── prisma/
│   └── scripts/
└── docs/
```

## Demo

[https://ducmanh.store](https://ducmanh.store)

## Tác giả

**Lưu Đức Mạnh**

Đề tài: *Xây dựng hệ thống bán máy tính tích hợp trợ lý ảo AI*
