import React, { useRef, useState } from 'react';
import { Edit3, Loader2, Plus, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useContacts } from '../hooks/useContacts';
import { createContact, updateContact } from '../services/contactsService';
import type { Contact, ContactInput, FollowUpProgress, Gender, GospelStatus, ResponseStatus } from '../types';

const emptyProgress: FollowUpProgress = { jof1_1: false, jof1_2: false, jof1_3: false };
const emptyInput = (): ContactInput => ({ name: '', phoneNumber: '', gender: 'male', gospelStatus: 'not_started', responseStatuses: [], followUpProgress: { ...emptyProgress }, remarks: '' });
const responseLabels: Record<ResponseStatus, string> = { pray_receive_christ: 'Prayed to receive Christ', already_christian: 'Already Christian', not_ready: 'Not ready', say_yes_follow_up: 'Said yes to follow-up' };

const ContactAvatar: React.FC<{ gender: Gender }> = ({ gender }) => (
  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><UserRound className="h-5 w-5" aria-label={`${gender} avatar`} /></div>
);

export const MySheepsPage: React.FC = () => {
  const { user } = useAuth();
  const { myContacts, communityContacts, loading, error, refresh } = useContacts();
  const visibleCommunityContacts = communityContacts.filter((contact) => contact.createdById !== user?.uid);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContactInput>(emptyInput);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const openCreate = () => { setEditing(null); setForm(emptyInput()); setSaveError(null); setShowForm(true); };
  const openEdit = (contact: Contact) => { setEditing(contact); setForm({ name: contact.name, phoneNumber: contact.phoneNumber || '', gender: contact.gender, gospelStatus: contact.gospelStatus, responseStatuses: [...contact.responseStatuses], followUpProgress: { ...contact.followUpProgress }, remarks: contact.remarks || '' }); setSaveError(null); setShowForm(true); };
  const setStatus = (gospelStatus: GospelStatus) => setForm((current) => ({ ...current, gospelStatus, responseStatuses: gospelStatus === 'not_started' ? [] : current.responseStatuses, followUpProgress: gospelStatus === 'not_started' ? { ...emptyProgress } : current.followUpProgress }));
  const toggleResponse = (response: ResponseStatus) => setForm((current) => {
    const selected = current.responseStatuses.includes(response);
    const next = selected ? current.responseStatuses.filter((item) => item !== response) : [...current.responseStatuses, response];
    return { ...current, responseStatuses: response === 'not_ready' && !selected ? ['not_ready'] : response !== 'not_ready' && current.responseStatuses.includes('not_ready') ? current.responseStatuses.filter((item) => item !== 'not_ready' && item !== response) : next, followUpProgress: response === 'say_yes_follow_up' && selected ? { ...emptyProgress } : current.followUpProgress };
  });
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptyInput()); };
  const save = async (addAnother: boolean) => {
    if (!user || !form.name.trim()) return;
    try {
      setSaving(true); setSaveError(null); setSuccess(null);
      if (editing) await updateContact(editing.id, form, editing.createdById, editing.createdByName);
      else await createContact(form, user.uid, user.displayName);
      await refresh();
      if (addAnother && !editing) { setForm(emptyInput()); setSuccess('Contact saved. Add another sheep.'); setTimeout(() => nameRef.current?.focus(), 0); }
      else closeForm();
    } catch (saveError) { console.error('Failed to save contact:', saveError); setSaveError('Unable to save this contact. Please try again.'); }
    finally { setSaving(false); }
  };
  const renderContact = (contact: Contact, community = false) => (
    <article key={contact.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <ContactAvatar gender={contact.gender} />
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-text">{contact.name}</p><p className="text-xs text-muted">{community ? `Added by ${contact.createdByName}` : responseLabels[contact.responseStatuses[0]] || 'Outreach contact'}</p></div>
      {(contact.createdById === user?.uid || user?.role === 'organizer') && <button type="button" onClick={() => openEdit(contact)} className="app-icon-button size-9" title="Edit contact"><Edit3 className="h-4 w-4" /></button>}
    </article>
  );

  return <section className="space-y-6">
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Outreach contacts</p><h2 className="mt-1 text-2xl font-bold text-text">My Sheeps</h2><p className="mt-1 text-sm text-muted">Keep track of the people you met and the next faithful step.</p></div><button type="button" onClick={openCreate} className="app-button-primary"><Plus className="h-4 w-4" />Add Contact</button></div>
    {success && <div className="app-alert-success">{success}</div>}{(error || saveError) && <div className="app-alert-error">{error || saveError}</div>}
    {loading ? <div className="app-loading-state min-h-48"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : <>
      <section className="app-panel p-5"><h3 className="font-bold text-text">My Contacts <span className="ml-1 text-xs font-normal text-muted">{myContacts.length}</span></h3><div className="mt-3">{myContacts.length ? myContacts.map((contact) => renderContact(contact)) : <p className="py-8 text-center text-sm text-muted">Your outreach contacts will appear here.</p>}</div></section>
      <section className="app-panel p-5"><h3 className="font-bold text-text">All Community Contacts <span className="ml-1 text-xs font-normal text-muted">{visibleCommunityContacts.length}</span></h3><div className="mt-3">{visibleCommunityContacts.length ? visibleCommunityContacts.map((contact) => renderContact(contact, true)) : <p className="py-8 text-center text-sm text-muted">No community contacts yet.</p>}</div></section>
    </>}
    {showForm && <div className="app-modal-backdrop items-end justify-center sm:items-center"><form className="app-modal max-h-[90vh] overflow-y-auto" onSubmit={(event) => { event.preventDefault(); void save(false); }}><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-text">{editing ? 'Edit Contact' : 'New Contact'}</h3><button type="button" onClick={closeForm} className="app-icon-button size-9">&times;</button></div><label className="mt-4 block"><span className="app-label">Name</span><input ref={nameRef} autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="app-input" /></label><div className="mt-3 grid grid-cols-2 gap-3"><label><span className="app-label">Phone</span><input value={form.phoneNumber} onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })} className="app-input" /></label><label><span className="app-label">Gender</span><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })} className="app-input"><option value="male">Male</option><option value="female">Female</option></select></label></div><label className="mt-3 block"><span className="app-label">Gospel progress</span><select value={form.gospelStatus} onChange={(event) => setStatus(event.target.value as GospelStatus)} className="app-input"><option value="not_started">Not started</option><option value="gospel_conversation">Gospel conversation</option><option value="gospel_presentation">Gospel presentation</option></select></label>{form.gospelStatus !== 'not_started' && <div className="mt-4"><span className="app-label">Response</span><div className="grid gap-2 sm:grid-cols-2">{(Object.keys(responseLabels) as ResponseStatus[]).map((response) => <label key={response} className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={form.responseStatuses.includes(response)} disabled={response !== 'not_ready' && form.responseStatuses.includes('not_ready')} onChange={() => toggleResponse(response)} />{responseLabels[response]}</label>)}</div></div>}{form.responseStatuses.includes('say_yes_follow_up') && <div className="mt-4"><span className="app-label">Journey of Faith progress</span>{(['jof1_1', 'jof1_2', 'jof1_3'] as const).map((step) => <label key={step} className="mt-2 flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={form.followUpProgress[step]} onChange={() => setForm({ ...form, followUpProgress: { ...form.followUpProgress, [step]: !form.followUpProgress[step] } })} />{step.replace('_', ' ').toUpperCase()}</label>)}</div>}<label className="mt-4 block"><span className="app-label">Remarks</span><textarea rows={3} value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} className="app-input" /></label><div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} className="app-button-secondary">Cancel</button>{!editing && <button type="button" disabled={saving} onClick={() => void save(true)} className="app-button-secondary">{saving ? 'Saving...' : 'Save & Add Another'}</button>}<button type="submit" disabled={saving} className="app-button-primary">{saving ? 'Saving...' : 'Save & Close'}</button></div></form></div>}
  </section>;
};
