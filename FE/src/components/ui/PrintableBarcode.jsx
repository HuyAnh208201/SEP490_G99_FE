import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

function isEan13(value) {
  return /^\d{13}$/.test(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[char]);
}

export default function PrintableBarcode({ value, productName }) {
  const svgRef = useRef(null);
  const [renderError, setRenderError] = useState('');
  const barcode = value?.trim() || '';

  useEffect(() => {
    if (!isEan13(barcode) || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, barcode, {
        format: 'EAN13',
        displayValue: true,
        fontSize: 14,
        height: 56,
        margin: 8,
      });
      setRenderError('');
    } catch (error) {
      setRenderError('The EAN-13 check digit is invalid. Generate a new barcode or correct the code.');
    }
  }, [barcode]);

  if (!barcode) return null;
  if (!isEan13(barcode)) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        A printable internal label requires a 13-digit EAN-13 barcode.
      </p>
    );
  }

  function printLabel() {
    const svg = svgRef.current?.outerHTML;
    if (!svg) return;
    const popup = window.open('', '_blank', 'width=420,height=260');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>Barcode label</title><style>body{font-family:Arial,sans-serif;padding:20px;text-align:center}.name{font-size:14px;font-weight:700;margin:0 0 8px}svg{max-width:100%;height:auto}</style></head><body><p class="name">${escapeHtml(productName || 'Product')}</p>${svg}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="rounded-xl border border-[#0058be]/20 bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">Printable barcode label</p>
      {renderError ? (
        <p className="mt-2 text-xs text-[var(--admin-danger)]">{renderError}</p>
      ) : (
        <svg ref={svgRef} className="mt-2 w-full" aria-label={`EAN-13 barcode ${barcode}`} />
      )}
      <button
        type="button"
        disabled={Boolean(renderError)}
        onClick={printLabel}
        className="mt-2 w-full rounded-lg border border-[#0058be]/30 px-3 py-2 text-xs font-semibold text-[#0058be] hover:bg-[#f0f6ff] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Print label
      </button>
    </div>
  );
}
