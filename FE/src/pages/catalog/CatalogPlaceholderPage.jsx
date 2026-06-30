import ModulePageShell from '../../components/ui/ModulePageShell.jsx';
import Card from '../../components/ui/Card.jsx';

const CATALOG_COPY = {
  categories: {
    title: 'Nhóm sản phẩm',
    description:
      'Bước 1 trong luồng khởi tạo — tạo danh mục/nhóm sản phẩm trước khi thêm SKU.',
    fields: ['Mã nhóm', 'Tên nhóm', 'Mô tả', 'Trạng thái'],
  },
  products: {
    title: 'Sản phẩm',
    description:
      'Bước 2 — mã, tên, barcode, giá chuẩn, đơn vị, hình ảnh. Validate trùng mã.',
    fields: ['Mã SP', 'Barcode', 'Giá bán', 'Đơn vị', 'Danh mục'],
  },
  suppliers: {
    title: 'Nhà cung cấp',
    description: 'Bước 3 — danh sách NCC tập trung cho toàn chuỗi, dùng khi nhập hàng.',
    fields: ['Tên NCC', 'Liên hệ', 'Điều khoản', 'Sản phẩm cung cấp'],
  },
};

export default function CatalogPlaceholderPage({ type = 'products' }) {
  const copy = CATALOG_COPY[type] || CATALOG_COPY.products;

  return (
    <ModulePageShell
      title={copy.title}
      description={copy.description}
      loading={false}
      comingSoon
    >
      <Card>
        <p className="mb-3 text-sm font-medium text-[var(--admin-text)]">
          Trường dữ liệu dự kiến (theo SRS & Function List):
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {copy.fields.map((f) => (
            <li
              key={f}
              className="rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)]"
            >
              {f}
            </li>
          ))}
        </ul>
      </Card>
    </ModulePageShell>
  );
}
