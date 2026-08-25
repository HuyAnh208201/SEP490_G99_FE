import { useEffect, useState } from 'react';
import { createCashier, createInventoryStaff } from '../../api/branches.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const ROLE_META = {
  cashier: {
    title: 'Add cashier',
    description: 'POS staff for this branch. Account is bound to the selected branch.',
    submit: 'Create cashier',
    create: createCashier,
  },
  inventory: {
    title: 'Add inventory staff',
    description: 'Stock and import staff for this branch.',
    submit: 'Create inventory staff',
    create: createInventoryStaff,
  },
};

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function BranchStaffModal({ open, onClose, branch, staffType, onCreated }) {
  const confirmSave = useSaveConfirmation();
  const meta = ROLE_META[staffType];
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setError('');
  }, [open, staffType]);

  if (!open || !branch || !meta) return null;

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const confirmed = await confirmSave({
      title: `Confirm ${meta.title.toLowerCase()}`,
      message: `Create the account for ${form.fullName.trim() || form.email.trim()} and assign it to ${branch.name}?`,
      confirmLabel: `Yes, ${meta.submit.toLowerCase()}`,
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await meta.create({
        ...form,
        branchId: branch.id,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meta.title}
      description={`${meta.description} Branch: ${branch.name}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Full name" required>
          <input
            required
            value={form.fullName}
            onChange={updateField('fullName')}
            className={inputClass}
          />
        </FormField>
        <FormField label="Email" required>
          <input
            required
            type="email"
            value={form.email}
            onChange={updateField('email')}
            className={inputClass}
          />
        </FormField>
        <FormField label="Phone" required>
          <input
            required
            pattern="0[0-9]{9}"
            value={form.phone}
            onChange={updateField('phone')}
            className={inputClass}
          />
        </FormField>
        <FormField
          label="Password"
          required
        >
          <input
            required
            type="password"
            value={form.password}
            onChange={updateField('password')}
            className={inputClass}
          />
        </FormField>
        <FormField label="Confirm password" required>
          <input
            required
            type="password"
            value={form.confirmPassword}
            onChange={updateField('confirmPassword')}
            className={inputClass}
          />
        </FormField>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {meta.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
