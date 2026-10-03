import React, { useMemo, useState } from 'react';
import { Check, Clipboard, Copy, Plus, RotateCcw, Trash2, UserPlus, X } from 'lucide-react';

type HelperPerson = { id: string; name: string };
type HelperPair = { id: string; members: HelperPerson[] };

const sampleNames = `1. Bryan
2. Gracia
3. Nathanael
4. John`;

const parseNames = (value: string): HelperPerson[] => {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+|[-*•])\s*[.)\-:]?\s*/, '').trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name, index) => ({ id: `person-${index}-${name.toLocaleLowerCase().replace(/\s+/g, '-')}`, name }));
};

const pairId = () => `pair-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const PairingHelperPage: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [people, setPeople] = useState<HelperPerson[]>([]);
  const [pairs, setPairs] = useState<HelperPair[]>([]);
  const [copied, setCopied] = useState(false);

  const assignedIds = useMemo(() => new Set(pairs.flatMap((pair) => pair.members.map((person) => person.id))), [pairs]);
  const available = people.filter((person) => !assignedIds.has(person.id));
  const assignedCount = people.length - available.length;

  const importNames = () => {
    const parsed = parseNames(sourceText);
    setPeople(parsed);
    setPairs([]);
    setCopied(false);
  };

  const assign = (personId: string, pairIdToUpdate: string) => {
    const person = available.find((entry) => entry.id === personId);
    if (!person) return;
    setPairs((current) => current.map((pair) => pair.id === pairIdToUpdate ? { ...pair, members: [...pair.members, person] } : pair));
  };

  const removeFromPair = (personId: string, pairIdToUpdate: string) => {
    setPairs((current) => current.map((pair) => pair.id === pairIdToUpdate ? { ...pair, members: pair.members.filter((person) => person.id !== personId) } : pair));
  };

  const addPair = () => setPairs((current) => [...current, { id: pairId(), members: [] }]);
  const removePair = (pairIdToRemove: string) => setPairs((current) => current.filter((pair) => pair.id !== pairIdToRemove));

  const autoPair = () => {
    const nextPairs = [...pairs];
    let remaining = [...available];
    while (remaining.length > 0) {
      const pair = nextPairs.find((entry) => entry.members.length < 2);
      if (pair) {
        pair.members = [...pair.members, remaining.shift()!];
      } else {
        nextPairs.push({ id: pairId(), members: [remaining.shift()!] });
      }
    }
    setPairs(nextPairs);
  };

  const reset = () => {
    setSourceText('');
    setPeople([]);
    setPairs([]);
    setCopied(false);
  };

  const copyResult = async () => {
    const text = pairs.filter((pair) => pair.members.length > 0)
      .map((pair, index) => `${index + 1}. ${pair.members.map((person) => person.name).join(' + ')}`)
      .join('\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="mx-auto max-w-5xl pb-8">
      <div className="-mx-4 -mt-6 bg-primary px-4 py-7 text-white sm:-mx-6 sm:-mt-8 sm:px-8">
        <div className="flex items-start gap-3">
          {/* <Handshake className="mt-1 h-7 w-7" aria-hidden="true" /> */}
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Pairing Helper</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">Paste a list of names and manage outreach pairs.</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="app-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold text-text">Name list</h2><p className="mt-1 text-xs text-muted">Numbered lines are cleaned automatically.</p></div>
            <button type="button" onClick={reset} className="app-button-text min-h-8 px-2 text-xs" disabled={!sourceText && !people.length}><RotateCcw className="h-3.5 w-3.5" /> Clear</button>
          </div>
          <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder={sampleNames} rows={9} className="app-input mt-4 resize-y font-mono text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={importNames} disabled={!sourceText.trim()} className="app-button-primary"><Clipboard className="h-4 w-4" /> Load names</button>
            <button type="button" onClick={() => setSourceText(sampleNames)} className="app-button-secondary">Use example</button>
          </div>
          {people.length > 0 && <div className="mt-5 border-t border-border pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Loaded people ({people.length})</p><div className="mt-2 flex flex-wrap gap-2">{people.map((person) => <span key={person.id} className={`rounded-full px-2.5 py-1 text-xs font-medium ${assignedIds.has(person.id) ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-text'}`}>{person.name}</span>)}</div></div>}
        </section>

        <section className="app-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-bold text-text">Pair workspace</h2><p className="mt-1 text-xs text-muted">{assignedCount} of {people.length} assigned · {available.length} available</p></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={autoPair} disabled={!available.length} className="app-button-secondary"><UserPlus className="h-4 w-4" /> Auto pair</button><button type="button" onClick={addPair} disabled={!people.length} className="app-button-primary"><Plus className="h-4 w-4" /> Add pair</button></div>
          </div>

          {people.length === 0 ? <div className="app-empty-state mt-5 border-dashed"><p className="text-sm font-medium text-text">Load names to begin pairing.</p><p className="mt-1 text-xs text-muted">Your pasted list stays in this page and is not saved to Firebase.</p></div> : <>
            <div className="mt-5 rounded-app-md border border-border bg-surface-muted p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-text">Available ({available.length})</h3><span className="text-xs text-muted">Not assigned yet</span></div><div className="mt-3 flex flex-wrap gap-2">{available.length ? available.map((person) => <span key={person.id} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text">{person.name}</span>) : <p className="text-xs italic text-muted">Everyone is assigned.</p>}</div></div>
            <div className="mt-5 space-y-3">{pairs.map((pair, index) => <div key={pair.id} className="rounded-app-md border border-primary-muted bg-primary-soft/40 p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-primary">Pair {index + 1}</span><button type="button" onClick={() => removePair(pair.id)} className="app-icon-button size-8 text-error" title="Remove pair"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="mt-3 flex min-h-9 flex-wrap gap-2">{pair.members.map((person) => <span key={person.id} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{person.name}<button type="button" onClick={() => removeFromPair(person.id, pair.id)} title={`Remove ${person.name}`}><X className="h-3 w-3" /></button></span>)}{!pair.members.length && <span className="self-center text-xs italic text-muted">Choose a name below</span>}</div><select value="" onChange={(event) => assign(event.target.value, pair.id)} className="app-input mt-3 py-2 text-xs"><option value="">+ Assign available name</option>{available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>)}</div>
            {!pairs.length && <p className="py-8 text-center text-sm italic text-muted">Add a pair or use Auto pair.</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setPairs([])} disabled={!pairs.length} className="app-button-secondary">Reset pairs</button><button type="button" onClick={() => void copyResult()} disabled={!pairs.some((pair) => pair.members.length)} className="app-button-primary">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy pairs'}</button></div>
          </>}
        </section>
      </div>
    </section>
  );
};
