import { useEffect, useMemo, useState } from 'react';

import { fetchBranches } from '../../api/branches.js';

import { createCampaign, updateCampaign } from '../../api/campaigns.js';

import { usePermissions } from '../../contexts/PermissionsContext.jsx';

import { normalizeWebRole } from '../../constants/userRoles.js';

import {

  CAMPAIGN_SCOPES,

  CAMPAIGN_TYPES,

  CHAIN_SCOPE_MODES,

  buildConditions,

  parseConditionsToForm,

  toApiDateTime,

  toDatetimeLocalValue,

} from '../../constants/campaigns.js';

import Modal from '../ui/Modal.jsx';

import Button from '../ui/Button.jsx';

import FormField from '../ui/FormField.jsx';

import MoneyInput from '../ui/MoneyInput.jsx';



const EMPTY = {

  name: '',

  type: 'PERCENT',

  discountValue: '',

  chainScopeMode: 'ALL',

  branchIds: [],

  priority: '0',

  startAt: '',

  endAt: '',

  minOrderAmount: '',

  buyQuantity: '',
  getQuantity: '',
  categoryId: '',
  unit: 'cai',
};



const inputClass =

  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';



function canPickScope(webRole) {

  return webRole === 'DIRECTOR' || webRole === 'ADMIN';

}



export default function CampaignFormModal({ open, onClose, onSaved, editing }) {

  const { role } = usePermissions();

  const webRole = normalizeWebRole(role);

  const isBranchManager = webRole === 'BRANCH_MANAGER';

  const scopeEditable = canPickScope(webRole);



  const [step, setStep] = useState('details');

  const [form, setForm] = useState(EMPTY);

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);



  useEffect(() => {

    if (!open) return;

    setStep('details');

    setError('');

    setShowAdvanced(false);

    if (editing) {

      const cond = parseConditionsToForm(editing.conditions);

      const branchIds = Array.isArray(editing.branchIds) ? editing.branchIds.map(String) : [];

      const isChainSubset = editing.scope === 'CHAIN' && branchIds.length > 0;

      setForm({

        name: editing.name || '',

        type: editing.type === 'BUY_X_GET_Y' ? 'PERCENT' : editing.type || 'PERCENT',

        discountValue: editing.discountValue ?? '',

        chainScopeMode: isChainSubset ? 'SUBSET' : 'ALL',

        branchIds,

        priority: String(editing.priority ?? 0),

        startAt: toDatetimeLocalValue(editing.startAt),

        endAt: toDatetimeLocalValue(editing.endAt),

        ...cond,

      });

    } else {

      setForm({ ...EMPTY });

    }

    fetchBranches()

      .then((data) => setBranches(Array.isArray(data) ? data : []))

      .catch(() => setBranches([]));

  }, [open, editing]);



  function patch(updates) {

    setForm((f) => ({ ...f, ...updates }));

  }



  function toggleBranch(id) {

    const sid = String(id);

    setForm((f) => {

      const set = new Set(f.branchIds);

      if (set.has(sid)) set.delete(sid);

      else set.add(sid);

      return { ...f, branchIds: [...set] };

    });

  }



  function goToConfirm(e) {

    e.preventDefault();

    setError('');

    if (!form.name.trim()) {

      setError('Campaign name is required.');

      return;

    }

    if (!form.startAt || !form.endAt) {

      setError('Start and end dates are required.');

      return;

    }

    if (new Date(form.endAt) <= new Date(form.startAt)) {

      setError('End date must be after start date.');

      return;

    }

    const discount = Number(form.discountValue);

    if (!Number.isFinite(discount) || discount < 0) {

      setError('Discount value must be a valid number.');

      return;

    }

    if (scopeEditable && form.chainScopeMode === 'SUBSET' && form.branchIds.length === 0) {

      setError('Select at least one branch to apply this promotion.');

      return;

    }

    setStep('confirm');

  }



  async function handleSave() {

    setError('');

    setLoading(true);



    const scope = isBranchManager ? 'BRANCH' : 'CHAIN';

    const branchIds =

      scopeEditable && form.chainScopeMode === 'SUBSET'

        ? form.branchIds.map(Number)

        : undefined;



    const payload = {

      name: form.name.trim(),

      type: form.type,

      discountValue: Number(form.discountValue),

      conditions: buildConditions(form.type, form),

      priority: Number(form.priority) || 0,

      startAt: toApiDateTime(form.startAt),

      endAt: toApiDateTime(form.endAt),

      scope,

      branchIds,

    };



    try {

      if (editing?.id) {

        await updateCampaign(editing.id, payload);

      } else {

        await createCampaign(payload);

      }

      onSaved?.();

      onClose();

    } catch (err) {

      const fieldErrors = err.errors ? Object.values(err.errors).join('. ') : '';

      setError(fieldErrors || err.message || 'Unable to save campaign');

      setStep('confirm');

    } finally {

      setLoading(false);

    }

  }



  const scopeSummary = useMemo(() => {

    if (isBranchManager) return 'Your branch only';

    if (form.chainScopeMode === 'ALL') return 'Entire chain (all branches)';

    const count = form.branchIds.length;

    return `Specific branches (${count} selected)`;

  }, [isBranchManager, form.chainScopeMode, form.branchIds.length]);



  const footer =

    step === 'details' ? (

      <div className="flex justify-end gap-2">

        <Button type="button" variant="secondary" onClick={onClose}>

          Cancel

        </Button>

        <Button type="submit" form="campaign-details-form">

          Continue

        </Button>

      </div>

    ) : (

      <div className="flex justify-end gap-2">

        <Button type="button" variant="secondary" onClick={() => setStep('details')}>

          Back

        </Button>

        <Button onClick={handleSave} loading={loading}>

          {editing ? 'Save changes' : 'Create campaign'}

        </Button>

      </div>

    );



  return (

    <Modal

      open={open}

      onClose={onClose}

      title={editing ? 'Edit campaign' : 'New campaign'}

      size="lg"

      footer={footer}

    >

      {step === 'details' && (

        <form id="campaign-details-form" onSubmit={goToConfirm} className="space-y-5">

          <FormField label="Campaign name" required>

            <input

              required

              autoFocus

              value={form.name}

              onChange={(e) => patch({ name: e.target.value })}

              className={inputClass}

              placeholder="e.g. Summer drink promo"

            />

          </FormField>



          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb]/50 p-4 space-y-4">

            <p className="text-xs font-semibold uppercase tracking-wide text-[#0058be]">

              Discount rule

            </p>



            <div className="grid gap-4 sm:grid-cols-2">

              <FormField label="Type" required>

                <select

                  value={form.type}

                  onChange={(e) => patch({ type: e.target.value })}

                  className={inputClass}

                >

                  {CAMPAIGN_TYPES.map((t) => (

                    <option key={t.value} value={t.value}>

                      {t.label}

                    </option>

                  ))}

                </select>

              </FormField>



              <FormField

                  label={form.type === 'PERCENT' ? 'Discount (%)' : 'Fixed discount (₫)'}

                  required

                >

                  {form.type === 'FIXED_AMOUNT' ? (

                    <MoneyInput

                      value={form.discountValue}

                      onChange={(v) => patch({ discountValue: v })}

                      required

                    />

                  ) : (

                    <input

                      required

                      type="number"

                      min="0"

                      step="0.01"

                      value={form.discountValue}

                      onChange={(e) => patch({ discountValue: e.target.value })}

                      className={inputClass}

                    />

                  )}

                </FormField>



              <FormField

                  label="Minimum order (₫)"

                  className="sm:col-span-2"

                >

                  <MoneyInput

                    value={form.minOrderAmount}

                    onChange={(v) => patch({ minOrderAmount: v })}

                  />

                </FormField>

            </div>

          </div>



          <div className="grid gap-4 sm:grid-cols-2">

            {scopeEditable ? (

              <FormField label="Scope" required className="sm:col-span-2">

                <select

                  value={form.chainScopeMode}

                  onChange={(e) =>

                    patch({

                      chainScopeMode: e.target.value,

                      branchIds: e.target.value === 'ALL' ? [] : form.branchIds,

                    })

                  }

                  className={inputClass}

                >

                  {CHAIN_SCOPE_MODES.map((s) => (

                    <option key={s.value} value={s.value}>

                      {s.label}

                    </option>

                  ))}

                </select>

                <p className="mt-1.5 text-xs text-[var(--admin-subtle)]">

                  {form.chainScopeMode === 'ALL'

                    ? 'Applies to every branch in the chain automatically.'

                    : 'Choose one or more branches below.'}

                </p>

              </FormField>

            ) : (

              <FormField label="Scope" className="sm:col-span-2">

                <input

                  readOnly

                  value={CAMPAIGN_SCOPES.find((s) => s.value === 'BRANCH')?.label || 'Single branch'}

                  className={`${inputClass} bg-[#f7f9fb]`}

                />

                <p className="mt-1.5 text-xs text-[var(--admin-subtle)]">

                  Branch manager promotions apply only to your assigned branch.

                </p>

              </FormField>

            )}



            <FormField label="Start" required>

              <input

                required

                type="datetime-local"

                value={form.startAt}

                onChange={(e) => patch({ startAt: e.target.value })}

                className={inputClass}

              />

            </FormField>



            <FormField label="End" required>

              <input

                required

                type="datetime-local"

                value={form.endAt}

                onChange={(e) => patch({ endAt: e.target.value })}

                className={inputClass}

              />

            </FormField>

          </div>



          {scopeEditable && form.chainScopeMode === 'SUBSET' && branches.length > 0 && (

            <FormField label="Select branches" required>

              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white p-2">

                {branches.map((b) => (

                  <label

                    key={b.id}

                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#f0f4f8]"

                  >

                    <input

                      type="checkbox"

                      checked={form.branchIds.includes(String(b.id))}

                      onChange={() => toggleBranch(b.id)}

                    />

                    {b.name}

                  </label>

                ))}

              </div>

            </FormField>

          )}



          <div>

            <button

              type="button"

              onClick={() => setShowAdvanced((v) => !v)}

              className="text-xs font-semibold uppercase tracking-wide text-[#0058be] hover:underline"

            >

              {showAdvanced ? 'Hide' : 'Show'} advanced options

            </button>

            {showAdvanced && (

              <div className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4">

                <FormField

                  label="Priority"

                >

                  <input

                    type="number"

                    min="0"

                    value={form.priority}

                    onChange={(e) => patch({ priority: e.target.value })}

                    className={inputClass}

                  />

                </FormField>

              </div>

            )}

          </div>



          {error && (

            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">

              {error}

            </div>

          )}



        </form>

      )}



      {step === 'confirm' && (

        <div className="space-y-4">

          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4 text-sm">

            <dl className="space-y-2">

              <div className="flex justify-between gap-4">

                <dt className="text-[var(--admin-muted)]">Name</dt>

                <dd className="font-medium">{form.name}</dd>

              </div>

              <div className="flex justify-between gap-4">

                <dt className="text-[var(--admin-muted)]">Type</dt>

                <dd>{CAMPAIGN_TYPES.find((t) => t.value === form.type)?.label}</dd>

              </div>

              <div className="flex justify-between gap-4">

                <dt className="text-[var(--admin-muted)]">Scope</dt>

                <dd className="text-right">{scopeSummary}</dd>

              </div>

              <div className="flex justify-between gap-4">

                <dt className="text-[var(--admin-muted)]">Period</dt>

                <dd className="text-right text-xs">

                  {form.startAt} → {form.endAt}

                </dd>

              </div>

            </dl>

          </div>



          {error && (

            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">

              {error}

            </div>

          )}



        </div>

      )}

    </Modal>

  );

}


