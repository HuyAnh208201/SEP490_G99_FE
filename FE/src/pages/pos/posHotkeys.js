/** True when the event target is an editable field — most POS hotkeys should stay quiet. */
export function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const el = target.closest('input, textarea, select, [contenteditable="true"]');
  return Boolean(el);
}
