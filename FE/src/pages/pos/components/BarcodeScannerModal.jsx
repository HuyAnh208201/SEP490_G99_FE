import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export default function BarcodeScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const detectingRef = useRef(false);
  const acceptedRef = useRef(false);
  const [status, setStatus] = useState('');

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
        const [module, stream] = await Promise.all([
          import('barcode-detector/ponyfill'),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          }),
        ]);
        const { BarcodeDetector, setZXingModuleOverrides } = module;

        // Mặc định thư viện tải zxing_reader.wasm từ CDN jsdelivr. Nếu tải hụt thì
        // detect() ném lỗi ở mọi frame và camera chạy hoài không nhận ra mã.
        // Trỏ về file tự host trong public/ để không phụ thuộc CDN.
        setZXingModuleOverrides?.({
          locateFile: (path, prefix) =>
            path.endsWith('.wasm') ? '/zxing_reader.wasm' : `${prefix}${path}`,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = new BarcodeDetector({ formats: FORMATS });
        setStatus('Point the camera at a product barcode.');

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
                // Tắt camera là khung hình đen ngay. Phải báo đang gọi API,
                // không thì người dùng tưởng máy treo.
                setStatus(`Đã đọc mã ${value} — đang tra cứu sản phẩm…`);
                await onDetected(value);
              }
            } catch (error) {
              // Vài frame lỗi lúc autofocus là bình thường; lỗi lặp lại liên tục nghĩa là
              // bộ giải mã hỏng thật (thường do wasm) — phải báo chứ không nuốt im lặng.
              failures += 1;
              if (failures >= 8) {
                setStatus(`Không khởi động được bộ giải mã: ${error?.message || error}`);
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
        setStatus(denied ? 'Camera permission was denied.' : 'Unable to open the camera.');
      }
    }

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, onDetected]);

  return (
    <Modal open={open} onClose={onClose} title="Scan product barcode" size="sm">
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
