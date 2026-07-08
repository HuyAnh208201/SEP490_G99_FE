import { useEffect, useState } from 'react';
import { sendBranchSuspendCode, updateBranchStatus } from '../../api/branches.js';
import { BRANCH_STATUS } from '../../lib/branchStatus.js';
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

export default function BranchSuspendModal({ open, onClose, branch, onDone }) {
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
  }, [open, branch?.id]);

  if (!open || !branch) return null;

  async function handleSendCode() {
    setError('');
    if (!email.trim()) {
      setError('Enter your account email to receive a verification code.');
      return;
    }
    setSending(true);
    try {
      await sendBranchSuspendCode(branch.id, email.trim());
      setCodeSent(true);
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSending(false);
    }
  }

  async function handleDeactivate() {
    setError('');
    if (!email.trim() || !code.trim()) {
      setError('Email and verification code are required.');
      return;
    }
    setSubmitting(true);
    try {
      await updateBranchStatus(branch.id, BRANCH_STATUS.SUSPENDED, {
        email: email.trim(),
        verificationCode: code.trim(),
      });
      onDone?.();
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
      title="Deactivate branch"
      description={`Confirm deactivation of "${branch.name}". This is a critical action and requires email verification.`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDeactivate} loading={submitting} disabled={!codeSent}>
            Deactivate branch
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Your account email" required hint="Must match the email you use to sign in.">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@chainstore.vn"
            className={inputClass}
          />
        </FormField>

        <div className="flex items-end gap-2">
          <FormField label="Verification code" required className="flex-1" hint="6-digit code from your email.">
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
            Verification code sent. Check your inbox and enter the code above.
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
