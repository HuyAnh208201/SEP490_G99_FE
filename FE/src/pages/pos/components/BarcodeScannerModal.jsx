import { useEffect, useRef, useState } from 'react';
import {
  BarcodeDetector,
  prepareZXingModule,
  setZXingModuleOverrides,
} from 'barcode-detector/ponyfill';
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import Modal from '../../../components/ui/Modal.jsx';

const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
const CUSTOMER_QR_FORMATS = ['qr_code'];

let wasmPrepared = false;

async function ensureBarcodeDecoderReady(formats) {
  setZXingModuleOverrides({
    locateFile: (path, prefix) =>
      path.endsWith('.wasm') ? zxingReaderWasmUrl : `${prefix}${path}`,
  });
  if (!wasmPrepared) {
    await prepareZXingModule({ fireImmediately: true });
    wasmPrepared = true;
  }
  return new BarcodeDetector({ formats });
}

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
  formats = PRODUCT_FORMATS,
  title = 'Scan product barcode',
  hint = '',
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const detectingRef = useRef(false);
  const acceptedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const stopCamera = () => {
      cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    async function start() {
      try {
        setStatus('Opening camera…');
        acceptedRef.current = false;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStatus('Starting barcode decoder…');
        const detector = await ensureBarcodeDecoderReady(formats);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setStatus(hint);

        let failures = 0;
        const detect = async () => {
          if (cancelled || acceptedRef.current) return;
          if (!detectingRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            detectingRef.current = true;
            try {
              const results = await detector.detect(video);
              failures = 0;
              const value = results[0]?.rawValue?.trim();
              if (value) {
                acceptedRef.current = true;
                stopCamera();
                setStatus(`Read ${value} — looking up…`);
                await onDetectedRef.current(value);
              }
            } catch (error) {
              failures += 1;
              if (failures >= 8) {
                setStatus(`Unable to start the barcode decoder: ${error?.message || error}`);
              }
            } finally {
              detectingRef.current = false;
            }
          }
          if (!cancelled && !acceptedRef.current) frameRef.current = requestAnimationFrame(detect);
        };
        frameRef.current = requestAnimationFrame(detect);
      } catch (error) {
        const denied = error?.name === 'NotAllowedError';
        setStatus(
          denied
            ? 'Camera permission was denied.'
            : `Unable to open the scanner: ${error?.message || error}`,
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, formats, hint]);


  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted playsInline className="aspect-[3/4] w-full object-cover" />
      </div>
      <p className="mt-3 text-center text-sm text-[var(--admin-muted)]">{status}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-lg border border-[var(--admin-border)] py-2.5 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[#f7f9fb]"
      >
        Cancel
      </button>
    </Modal>
  );
}

export { PRODUCT_FORMATS, CUSTOMER_QR_FORMATS };
