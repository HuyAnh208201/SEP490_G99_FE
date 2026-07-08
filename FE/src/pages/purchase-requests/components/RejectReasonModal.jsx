import { useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';

/** Required reason popup when rejecting a request. */
export default function RejectReasonModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!reason.trim()) {
      setError('Please enter a rejection reason.');
      return;
    }
    onConfirm(reason.trim());
  }

  function handleClose() {
    setReason('');
    setError('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reject request"
      description="Provide a clear reason so the branch can follow up."
      size="sm"
    >
      <div className="space-y-4">
        <textarea
          autoFocus
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Quarterly budget is full — please resubmit next month…"
          className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button className="!bg-[var(--admin-danger)] hover:!bg-red-800" loading={loading} onClick={handleConfirm}>
            Confirm rejection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
