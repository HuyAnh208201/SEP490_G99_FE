/**
 * Local draft storage for admin setup modules until backend CRUD is available.
 * Data syncs to real APIs when endpoints land on develop.
 */

const KEYS = {
  products: 'chainstore_draft_products',
  suppliers: 'chainstore_draft_suppliers',
  branches: 'chainstore_draft_branches',
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function nextId(list) {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}

export function listDraft(type) {
  return read(KEYS[type]);
}

export function addDraft(type, item) {
  const list = read(KEYS[type]);
  const entry = { ...item, id: nextId(list), createdAt: new Date().toISOString() };
  list.push(entry);
  write(KEYS[type], list);
  return entry;
}

export function updateDraft(type, id, patch) {
  const list = read(KEYS[type]);
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  write(KEYS[type], list);
  return list[idx];
}

export function removeDraft(type, id) {
  const list = read(KEYS[type]).filter((x) => x.id !== id);
  write(KEYS[type], list);
}
