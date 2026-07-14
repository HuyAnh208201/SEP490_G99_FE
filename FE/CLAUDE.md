# ChainStore — Vibe Coding Guide

> Hệ thống Quản lý chuỗi cửa hàng (Chain Store Management).
> React 18 + Vite 5 + Tailwind CSS v4 + React Router v6.

## TL;DR cho AI / dev mới

- Stack: **Vite + React (JS, không TS)**, Tailwind v4 (plugin Vite, không cần `tailwind.config.js`), React Router v6, Axios.
- Alias: `@` → `src/`.
- Auth: `AuthContext` + `useAuth()` + `localStorage` token. API gọi qua `src/api/http.js` (axios instance) và `src/api/auth.js` (mock).
- Style direction: **dark luxury + glow + glassmorphism nhẹ** (xem `src/styles/tokens.css`). Palette: indigo/cyan trên nền navy sâu.
- Mỗi page sống trong `src/pages/<feature>/<Page>.jsx`. Component dùng chung trong `src/components/`.

## Cấu trúc thư mục

```
chainstore-admin/
├── CLAUDE.md                  # File này
├── README.md                  # Hướng dẫn chạy
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── public/
│   └── logo.svg
└── src/
    ├── main.jsx               # Entry — mount React + Router + AuthProvider
    ├── App.jsx                # Định nghĩa routes
    ├── api/
    │   ├── http.js            # Axios instance + interceptors
    │   └── auth.js            # login() / logout() (mock)
    ├── contexts/
    │   └── AuthContext.jsx    # AuthProvider + useAuth hook
    ├── routes/
    │   └── ProtectedRoute.jsx # HOC redirect /login nếu chưa auth
    ├── pages/
    │   ├── login/
    │   │   └── LoginPage.jsx
    │   └── dashboard/
    │       └── DashboardPage.jsx  # placeholder
    ├── components/
    │   ├── ui/
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   └── PasswordInput.jsx
    │   └── brand/
    │       └── Logo.jsx
    └── styles/
        ├── tokens.css         # Design tokens (CSS vars)
        └── global.css         # Tailwind + base layer + scrollbar
```

## Quy ước code (vibe-friendly)

1. **Component = 1 file**, tên PascalCase, default export.
2. **Hook custom** đặt trong `src/hooks/`, `useFoo.js`, named export.
3. **Không mutate state**. Spread/Object.assign hoặc immer khi cần.
4. **Tailwind first.** Nếu cần style phức tạp (gradient mesh, animation key-frames), bỏ vào `tokens.css` hoặc inline `style={{}}` cho rõ ràng.
5. **Form validation**: HTML5 + state cục bộ trước; chỉ kéo react-hook-form khi form thực sự phức tạp.
6. **API call**: luôn qua `src/api/*`. Component không gọi axios trực tiếp.
7. **UI language**: English only for all user-facing FE strings. Do not hardcode Vietnamese UI copy.
8. **Layout density**: Prefer full-width list/table pages (`w-full`). Sacrifice side whitespace so tables are readable without horizontal scroll caused by empty gutters.

## Style direction (đừng đi chệch)

- Nền: gradient navy → indigo sâu, có 1-2 vùng glow xanh dương dịu.
- Card login: 2 cột — trái pitch sản phẩm (gradient + glow + grid pattern), phải form trắng.
- Border radius: `rounded-2xl` cho card lớn, `rounded-xl` cho input/button.
- Typography: system stack hoặc Inter; tiêu đề `font-semibold tracking-tight`.
- Motion: tinh tế. Hover button → scale 1.01 + brightness 1.05. Focus ring indigo.

## Mock login

```
Tên đăng nhập: admin
Mật khẩu:     admin123
```

Sau khi đăng nhập, lưu token giả `chainstore_token` vào `localStorage` và điều hướng `/dashboard`.

## Lệnh thường dùng

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Khi thêm tính năng mới

1. Tạo folder `src/pages/<feature>/`.
2. Khai báo route trong `src/App.jsx`. Nếu cần auth: bọc `<ProtectedRoute>`.
3. Nếu có call API: thêm hàm trong `src/api/<feature>.js`.
4. Component tái sử dụng → đẩy lên `src/components/ui/` hoặc `src/components/<domain>/`.
5. Giữ file < 300 dòng. Tách ra khi vượt.
