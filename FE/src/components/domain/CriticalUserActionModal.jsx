import { useEffect, useState } from 'react';
import { sendCriticalUserActionCode } from '../../api/users.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function CriticalUserActionModal({
  open,
  onClose,
  user,
  actionType,
  actionLabel,
  onConfirm,
}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setCode('');
    setCodeSent(false);
    setError('');
  }, [open, user?.id]);

  if (!open || !user) return null;

  async function handleSendCode() {
    setError('');
    if (!email.trim()) {
      setError('Enter your account email to receive a verification code.');
      return;
    }
    setSending(true);
    try {
      await sendCriticalUserActionCode(user.id, email.trim(), actionType);
      setCodeSent(true);
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm() {
    setError('');
    if (!email.trim() || !code.trim()) {
      setError('Email and verification code are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        email: email.trim(),
        verificationCode: code.trim(),
      });
      onClose();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${actionLabel} critical account`}
      description={`Confirm ${actionLabel.toLowerCase()} for "${user.name}". This requires email verification like branch deactivation.`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={submitting} disabled={!codeSent}>
            {actionLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Your account email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@chainstore.vn"
            className={inputClass}
          />
        </FormField>

        <div className="flex items-end gap-2">
          <FormField label="Verification code" required className="flex-1">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className={inputClass}
            />
          </FormField>
          <Button type="button" variant="secondary" loading={sending} onClick={handleSendCode}>
            Send email
          </Button>
        </div>

        {codeSent && (
          <p className="text-sm text-emerald-700">
            Verification code sent. Check your inbox.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
