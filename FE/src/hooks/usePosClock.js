import { useEffect, useState } from 'react';
import { http } from '../api/http.js';

/**
 * Đồng hồ POS: bù lệch giờ máy bằng epoch từ BE (/api/system/time), cập nhật mỗi giây.
 * Online/offline theo navigator + sự kiện mạng.
 */
export function usePosClock(pollMs = 60_000) {
  const [offsetMs, setOffsetMs] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  );

  useEffect(() => {
    let cancelled = false;

    async function syncServerTime() {
      const started = Date.now();
      try {
        const { data } = await http.get('/system/time');
        if (cancelled) return;
        const epochMs = data?.data?.epochMs ?? data?.epochMs;
        if (typeof epochMs !== 'number') return;
        const rtt = (Date.now() - started) / 2;
        setOffsetMs(epochMs + rtt - Date.now());
        setOnline(true);
      } catch {
        if (!cancelled) {
          setOnline(typeof navigator !== 'undefined' ? navigator.onLine : false);
        }
      }
    }

    syncServerTime();
    const poll = window.setInterval(syncServerTime, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [pollMs]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNow(new Date(Date.now() + offsetMs));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [offsetMs]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { now, online };
}
