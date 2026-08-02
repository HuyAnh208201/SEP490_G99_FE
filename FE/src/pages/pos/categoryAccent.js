// Bảng màu phụ chỉ để thu ngân phân biệt nhóm hàng bằng mắt — không mang ý nghĩa
// nghiệp vụ. Màu chính của POS vẫn là --admin-brand để đồng bộ với các màn khác.
const ACCENTS = [
  { text: '#0058be', bg: '#e8f0fe', border: '#c3d9f7', tint: '#f3f8ff' },
  { text: '#0d7a3e', bg: '#e4f6ec', border: '#bfe6d0', tint: '#f2fbf6' },
  { text: '#a55a00', bg: '#fdf0dc', border: '#f3d5a6', tint: '#fff9ef' },
  { text: '#6b3fbe', bg: '#f0e9fd', border: '#d7c6f5', tint: '#f8f5ff' },
  { text: '#b52a55', bg: '#fde8ee', border: '#f5c2d1', tint: '#fff5f8' },
  { text: '#0f6f7a', bg: '#e2f4f6', border: '#b5e0e5', tint: '#f1fbfc' },
  { text: '#b4460f', bg: '#fdeae1', border: '#f5c7b1', tint: '#fff6f2' },
  { text: '#3f4bbe', bg: '#e9ebfd', border: '#c7ccf5', tint: '#f5f6ff' },
];

export const ALL_PRODUCTS_ID = 'all';

/** Cùng một tên danh mục luôn ra cùng một màu, kể cả sau khi tải lại trang. */
export function categoryAccent(name) {
  if (!name || name === ALL_PRODUCTS_ID) return ACCENTS[0];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

/** Chữ cái đại diện dùng thay icon — hợp với cả tên danh mục tiếng Việt. */
export function categoryInitials(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '#';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
