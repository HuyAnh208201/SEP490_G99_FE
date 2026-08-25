import { useEffect, useState } from 'react';
import { createBranch, updateBranch } from '../../api/branches.js';
import { composeAddress, parseAddress } from '../../lib/vietnamAddress.js';
import {
  formatOperatingHours,
  parseOperatingHours,
  validateOperatingHours,
} from '../../lib/operatingHours.js';
import { BRANCH_STATUS, normalizeBranchStatus } from '../../lib/branchStatus.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import OperatingHoursPicker from '../ui/OperatingHoursPicker.jsx';
import VietnamAddressPicker from '../ui/VietnamAddressPicker.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const EMPTY_ADDRESS = { street: '', provinceId: '', districtId: '' };
const EMPTY_HOURS = { open: '08:00', close: '22:00' };

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function BranchFormModal({ open, onClose, onSaved, editing }) {
  const confirmSave = useSaveConfirmation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [hours, setHours] = useState(EMPTY_HOURS);
  const [status, setStatus] = useState(BRANCH_STATUS.ACTIVE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setAddressError('');
    if (editing) {
      setName(editing.name || '');
      setPhone(editing.phone || '');
      setAddress(parseAddress(editing.address));
      setHours(parseOperatingHours(editing.operatingHours));
      setStatus(normalizeBranchStatus(editing.status));
    } else {
      setName('');
      setPhone('');
      setAddress(EMPTY_ADDRESS);
      setHours(EMPTY_HOURS);
      setStatus(BRANCH_STATUS.ACTIVE);
    }
  }, [open, editing]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setAddressError('');

    if (!address.provinceId || !address.districtId) {
      setAddressError('Select province/city and district.');
      return;
    }
    const hoursError = validateOperatingHours(hours.open, hours.close);
    if (hoursError) {
      setError(hoursError);
      return;
    }

    const confirmed = await confirmSave({
      title: editing ? 'Confirm branch changes' : 'Confirm new branch',
      message: editing
        ? `Save the changes to ${name.trim() || 'this branch'}?`
        : `Create ${name.trim() || 'this branch'} and make it available in the system?`,
      confirmLabel: editing ? 'Yes, save changes' : 'Yes, create branch',
    });
    if (!confirmed) return;

    setSaving(true);
    const payload = {
      name: name.trim(),
      address: composeAddress(address),
      phone: phone.trim(),
      operatingHours: formatOperatingHours(hours.open, hours.close),
    };

    try {
      if (editing?.id) {
        await updateBranch(editing.id, { ...payload, status });
      } else {
        await createBranch(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit branch' : 'New branch'}
      description="Store location with structured address and operating hours."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Branch name" required>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ChainStore Downtown"
            className={inputClass}
          />
        </FormField>

        <VietnamAddressPicker
          street={address.street}
          provinceId={address.provinceId}
          districtId={address.districtId}
          onChange={setAddress}
          locationError={addressError}
        />

        <FormField label="Phone" required>
          <input
            required
            pattern="0[0-9]{9}"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912345678"
            className={inputClass}
          />
        </FormField>

        <OperatingHoursPicker
          open={hours.open}
          close={hours.close}
          onChange={setHours}
          error={error && error.includes('time') ? error : ''}
        />

        {editing && (
          <FormField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value={BRANCH_STATUS.ACTIVE}>Active</option>
              <option value={BRANCH_STATUS.SUSPENDED}>Deactivated</option>
            </select>
          </FormField>
        )}

        {error && !error.includes('time') && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Create branch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
