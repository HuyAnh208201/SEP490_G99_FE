export const DEFAULT_PAGE_SIZE = 20;

export function unwrapPage(body, mapItem = (item) => item) {
  if (!body?.success) {
    const error = new Error(body?.message || 'Request failed');
    error.errors = body?.errors ?? body?.data;
    error.status = body?.statusCode;
    throw error;
  }

  const page = body.data ?? {};
  return {
    items: (page.listObjects ?? []).map(mapItem),
    page: page.pageNumber ?? 1,
    size: page.pageSize ?? DEFAULT_PAGE_SIZE,
    totalRecords: page.totalRecords ?? 0,
    totalPages: page.totalPages ?? 0,
    hasNext: Boolean(page.hasNext),
    hasPrevious: Boolean(page.hasPrevious),
  };
}

export function compactPageParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value !== undefined && value !== null && value !== '' && value !== 'all'),
  );
}
