# FAQ Assistant — Setup Guide

## Bước 1: Tạo Supabase Project

1. Vào https://supabase.com và tạo project mới
2. Lấy **Project URL** và **Anon Key** từ Settings > API

## Bước 2: Cấu hình database

1. Vào Supabase > SQL Editor
2. Chạy toàn bộ file: `supabase/migrations/001_initial_schema.sql`
3. Vào Storage > tạo bucket tên `documents` (Public: false)

## Bước 3: Tạo file .env

```
cd frontend
copy .env.example .env
```

Điền vào `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

## Bước 4: Deploy Edge Functions

Cài Supabase CLI:
```
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy functions:
```
supabase functions deploy chat
supabase functions deploy embed-document
```

Thêm secrets cho Edge Functions:
```
supabase secrets set OPENAI_API_KEY=sk-...
```

## Bước 5: Tạo Admin User

Vào Supabase > Authentication > Users > Add User
- Email: admin@yourcompany.com
- Password: chọn mật khẩu mạnh

## Bước 6: Chạy Frontend

```
cd frontend
npm install
npm run dev
```

Mở: http://localhost:5173

- Trang chat chính: http://localhost:5173
- Trang admin: http://localhost:5173/admin

## Cấu trúc thư mục

```
AGENT FAQ COMPANY/
├── frontend/              # React app
│   ├── src/
│   │   ├── pages/        # ChatPage, AdminDashboard, AdminLoginPage
│   │   ├── components/   # chat/, admin/ components
│   │   ├── hooks/        # useChat, useAdmin
│   │   └── lib/          # supabase client, utils
│   └── .env              # env vars (tạo từ .env.example)
└── supabase/
    ├── migrations/        # SQL schema
    └── functions/
        ├── chat/          # Edge function: search + AI answer
        └── embed-document/ # Edge function: parse + embed docs
```

## Luồng hoạt động

```
User hỏi → Edge Function chat
  → Tìm FAQ (full-text search)
  → Nếu không có: tìm document chunks (vector search)
  → Nếu không có: báo "chưa có thông tin"
  → Trả kết quả + nguồn tham khảo
  → Ghi log + cập nhật popular_questions
```
