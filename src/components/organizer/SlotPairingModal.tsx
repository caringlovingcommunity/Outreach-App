import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { saveEventPairing, subscribeToEventPairing } from '../../services/eventsService';

export interface AvailableStudent {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  gender?: 'male' | 'female';
}

interface PairGroup {
  id: string;
  members: AvailableStudent[];
}

interface SlotPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotLabel: string;
  eventId?: string;
  slotId?: string;
  createdByUid?: string;
  availableStudents: AvailableStudent[];
}

const studentName = (student: AvailableStudent) => student.displayName.trim() || 'Anonymous Student';

export const SlotPairingModal: React.FC<SlotPairingModalProps> = ({ isOpen, onClose, slotLabel, eventId, slotId, createdByUid, availableStudents }) => {
  const [unassigned, setUnassigned] = useState<AvailableStudent[]>([]);
  const [pairs, setPairs] = useState<PairGroup[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setUnassigned(availableStudents);
    setPairs([]);
    setCopied(false);
    setError(null);
    if (!eventId || !slotId) return;
    setLoading(true);
    const unsubscribe = subscribeToEventPairing(eventId, slotId, (pairing) => {
        const savedIds = new Set((pairing?.groups || []).flatMap((group) => group.memberIds));
        const memberMap = new Map(availableStudents.map((student) => [student.uid, student]));
        setPairs((pairing?.groups || []).map((group) => ({
          id: group.id,
          members: group.memberIds.map((uid) => memberMap.get(uid)).filter(Boolean) as AvailableStudent[],
        })));
        setUnassigned(availableStudents.filter((student) => !savedIds.has(student.uid)));
        setLoading(false);
      }, () => {
        setError('Unable to load saved pairings.');
        setLoading(false);
      });
    return unsubscribe;
  }, [availableStudents, eventId, isOpen, slotId]);

  if (!isOpen) return null;

  const addPair = () => setPairs((current) => [...current, { id: `pair_${Date.now()}_${current.length}`, members: [] }]);
  const removePair = (pairId: string) => {
    const pair = pairs.find((item) => item.id === pairId);
    if (!pair) return;
    setPairs((current) => current.filter((item) => item.id !== pairId));
    setUnassigned((current) => [...current, ...pair.members]);
  };
  const assignStudent = (studentUid: string, pairId: string) => {
    const student = unassigned.find((item) => item.uid === studentUid);
    if (!student) return;
    setUnassigned((current) => current.filter((item) => item.uid !== studentUid));
    setPairs((current) => current.map((pair) => pair.id === pairId ? { ...pair, members: [...pair.members, student] } : pair));
  };
  const removeStudent = (studentUid: string, pairId: string) => {
    const pair = pairs.find((item) => item.id === pairId);
    const student = pair?.members.find((item) => item.uid === studentUid);
    if (!student) return;
    setPairs((current) => current.map((item) => item.id === pairId ? { ...item, members: item.members.filter((member) => member.uid !== studentUid) } : item));
    setUnassigned((current) => [...current, student]);
  };

  const validPairs = pairs.filter((pair) => pair.members.length > 0);
  const whatsappText = [`Pair for ${slotLabel}`, ...validPairs.map((pair, index) => `${index + 1}.${pair.members.map(studentName).join(' + ')}`)].join('\n');
  const copyWhatsApp = async () => {
    if (!validPairs.length) return;
    await navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  };

  const savePairing = async () => {
    if (!eventId || !slotId || !createdByUid) return;
    try {
      setSaving(true);
      setError(null);
      await saveEventPairing(eventId, slotId, createdByUid, validPairs.map((pair) => ({
        id: pair.id,
        memberIds: pair.members.map((member) => member.uid),
        memberNames: Object.fromEntries(pair.members.map((member) => [member.uid, studentName(member)])),
      })));
    } catch (saveError) {
      console.error('Failed to save event pairing:', saveError);
      setError('Unable to save pairings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-backdrop items-end justify-center sm:items-center" role="presentation" onClick={onClose}>
      <section className="app-modal max-h-[90vh] max-w-3xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="slot-pairing-title" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div><h2 id="slot-pairing-title" className="text-lg font-bold text-text">Manual Pair Matching</h2><p className="mt-1 text-xs text-muted">{slotLabel} · {availableStudents.length} available</p></div>
          <button type="button" onClick={onClose} className="app-icon-button size-9" title="Close pairing modal"><X className="h-4 w-4" /></button>
        </div>
        {error && <div className="app-alert-error mt-4 text-xs">{error}</div>}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="rounded-app-md border border-border bg-surface-muted p-3"><h3 className="text-sm font-semibold text-text">Available Students ({unassigned.length})</h3><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{unassigned.length ? unassigned.map((student) => <div key={student.uid} className="rounded-app-sm border border-border bg-surface p-2"><p className="text-sm font-medium text-text">{studentName(student)}</p>{student.phoneNumber && <p className="text-xs text-muted">{student.phoneNumber}</p>}</div>) : <p className="py-5 text-center text-xs italic text-muted">All students are assigned.</p>}</div></div>
          <div><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-text">Outreach Groups ({pairs.length})</h3><button type="button" onClick={addPair} className="app-button-secondary min-h-8 px-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add Pair</button></div><div className="mt-3 max-h-64 space-y-3 overflow-y-auto">{pairs.length ? pairs.map((pair, index) => <div key={pair.id} className="rounded-app-md border border-primary-muted bg-primary-soft/40 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-primary">Pair {index + 1}</span><button type="button" onClick={() => removePair(pair.id)} className="app-icon-button size-8 text-error" title="Delete pair"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-2 flex flex-wrap gap-1.5">{pair.members.map((member) => <span key={member.uid} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary">{studentName(member)}<button type="button" onClick={() => removeStudent(member.uid, pair.id)} title={`Remove ${studentName(member)}`}><X className="h-3 w-3" /></button></span>)}</div>{unassigned.length > 0 && <select className="app-input mt-3 py-2 text-xs" value="" onChange={(event) => assignStudent(event.target.value, pair.id)}><option value="">+ Select student to add...</option>{unassigned.map((student) => <option key={student.uid} value={student.uid}>{studentName(student)}</option>)}</select>}</div>) : <p className="py-5 text-center text-xs italic text-muted">Add a pair, then assign students.</p>}</div></div>
        </div>}
        {validPairs.length > 0 && <div className="mt-4 rounded-app-md bg-text p-3 font-mono text-xs text-success"><p className="mb-1 font-sans text-[10px] uppercase text-white/60">WhatsApp Preview</p><pre className="whitespace-pre-wrap">{whatsappText}</pre></div>}
        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-muted">{copied ? 'Copied to clipboard.' : `${validPairs.length} group(s) ready`}</span><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="app-button-secondary">Close</button><button type="button" onClick={() => void copyWhatsApp()} disabled={!validPairs.length || saving} className="app-button-secondary">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy for WhatsApp'}</button><button type="button" onClick={() => void savePairing()} disabled={saving || loading} className="app-button-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving...' : 'Save Pairings'}</button></div></div>
      </section>
    </div>
  );
};