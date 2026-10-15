import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage, fieldErrors } from '../services/api';
import { Alert, Field } from './ui';

const ID_TYPES = [
  ['AADHAAR', 'Aadhaar'], ['PAN', 'PAN'], ['PASSPORT', 'Passport'], ['VOTER_ID', 'Voter ID'], ['DRIVING_LICENSE', 'Driving licence'],
];
const MAX_BYTES = 5 * 1024 * 1024;
const BLANK = { name: '', email: '', phone: '', dateOfBirth: '', address: '', identityType: 'AADHAAR', identityNumber: '', password: '', confirm: '', accountType: 'SAVINGS', activate: true };

/**
 * One form for both self-registration (mode="register") and admin onboarding (mode="admin").
 * `onSubmit(formData)` must return a promise; a rejected value of the API error shape is shown inline.
 */
export default function CustomerForm({ mode = 'register', onSubmit, submitLabel = 'Register', onSuccess }) {
  const admin = mode === 'admin';
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const documentRequired = !admin || !form.activate;

  const validateLocally = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter the full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!/^(\+91)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!form.dateOfBirth) e.dateOfBirth = 'Select the date of birth';
    if (form.address.trim().length < 5) e.address = 'Enter the address';
    if (!/^[A-Za-z0-9-]{4,30}$/.test(form.identityNumber)) e.identityNumber = 'Enter 4-30 letters or digits';
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
      e.password = 'At least 8 characters with upper-case, lower-case and a digit';
    }
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!file && documentRequired) e.identityDocument = 'Upload an identity document';
    else if (file && file.size > MAX_BYTES) e.identityDocument = 'File must be 5 MB or smaller';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    const local = validateLocally();
    setErrors(local);
    if (Object.keys(local).length) return;
    const data = new FormData();
    ['name', 'email', 'phone', 'dateOfBirth', 'address', 'identityType', 'identityNumber', 'password'].forEach((k) => data.append(k, form[k]));
    if (admin) {
      data.append('accountType', form.accountType);
      data.append('activate', String(form.activate));
    }
    if (file) data.append('identityDocument', file);
    setBusy(true);
    try {
      await onSubmit(data);
      setForm(BLANK);
      setFile(null);
      setFileKey((k) => k + 1);
      onSuccess?.();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const input = (id, props = {}) => (
    <input id={id} className="input" value={form[id]} onChange={set(id)} aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-error` : undefined} {...props} />
  );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Alert type="error">{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" error={errors.name}>{input('name', { autoComplete: 'name' })}</Field>
        <Field label="Email" htmlFor="email" error={errors.email}>{input('email', { type: 'email', autoComplete: admin ? 'off' : 'email' })}</Field>
        <Field label="Phone number" htmlFor="phone" error={errors.phone}>{input('phone', { type: 'tel', autoComplete: admin ? 'off' : 'tel', placeholder: '9876543210' })}</Field>
        <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>{input('dateOfBirth', { type: 'date', max: new Date().toISOString().slice(0, 10) })}</Field>
      </div>
      <Field label="Address" htmlFor="address" error={errors.address}>
        <textarea id="address" rows={2} className="input" value={form.address} onChange={set('address')} aria-invalid={!!errors.address} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Identity document type" htmlFor="identityType" error={errors.identityType}>
          <select id="identityType" className="input" value={form.identityType} onChange={set('identityType')}>
            {ID_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Identity number" htmlFor="identityNumber" error={errors.identityNumber}>{input('identityNumber')}</Field>
      </div>
      <Field label={`Identity document (PDF, JPG or PNG, max 5 MB)${documentRequired ? '' : ' — optional'}`} htmlFor="identityDocument" error={errors.identityDocument}>
        <input key={fileKey} id="identityDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="input h-auto cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          onChange={(e) => setFile(e.target.files?.[0] || null)} aria-invalid={!!errors.identityDocument} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={admin ? 'Temporary password' : 'Password'} htmlFor="password" error={errors.password}>{input('password', { type: 'password', autoComplete: 'new-password' })}</Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>{input('confirm', { type: 'password', autoComplete: 'new-password' })}</Field>
      </div>
      {admin && (
        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <Field label="Account type" htmlFor="accountType" error={errors.accountType}>
            <select id="accountType" className="input" value={form.accountType} onChange={set('accountType')}>
              <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option>
            </select>
          </Field>
          <label className="flex cursor-pointer items-start gap-3 pt-6 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" checked={form.activate} onChange={(e) => setForm({ ...form, activate: e.target.checked })} />
            <span><span className="font-medium text-slate-900">Verify and activate now</span><br /><span className="text-xs text-slate-500">Otherwise the customer is queued for document review.</span></span>
          </label>
        </div>
      )}
      <button type="submit" className="btn-primary h-11 w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {submitLabel}
      </button>
    </form>
  );
}
