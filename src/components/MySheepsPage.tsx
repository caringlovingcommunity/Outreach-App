import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Edit3, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useContacts } from "../hooks/useContacts";
import {
  createContact,
  deleteContact,
  updateContact,
} from "../services/contactsService";
import type {
  Contact,
  ContactInput,
  FollowUpProgress,
  Gender,
  GospelStatus,
  ResponseStatus,
} from "../types";
import { JOURNEY_OF_FAITH_STEPS } from "../types";
const emptyProgress: FollowUpProgress = {
  vision_cast: false,
  jof1_1: false,
  jof1_2: false,
  jof1_3: false,
  jof1_4: false,
  jof1_5: false,
  jof1_6: false,
  jof1_7: false,
  jof1_8: false,
};
const emptyInput = (): ContactInput => ({
  name: "",
  phoneNumber: "",
  gender: "male",
  gospelStatus: "not_started",
  responseStatuses: [],
  followUpProgress: { ...emptyProgress },
  remarks: "",
});
const DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_BUCKETS = [
  "Upcoming",
  "Today",
  "Yesterday",
  "Last week",
  "Last month",
  "Last year",
  "Older",
  "Unknown date",
] as const;
type ContactDateBucket = typeof DATE_BUCKETS[number];

const getContactDate = (contact: Contact): Date | null => {
  const createdAt = contact.createdAt;
  const date =
    createdAt instanceof Date
      ? createdAt
      : typeof createdAt?.toDate === "function"
        ? createdAt.toDate()
        : null;
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
};

const getContactDateBucket = (date: Date | null, now = new Date()): ContactDateBucket => {
  if (!date) return "Unknown date";
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const contactDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((today - contactDay) / DAY_MS);
  if (daysAgo < 0) return "Upcoming";
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo <= 7) return "Last week";
  if (daysAgo <= 30) return "Last month";
  if (daysAgo <= 365) return "Last year";
  return "Older";
};

const getDateGroups = (contacts: Contact[]) => {
  const groupedContacts = new Map<ContactDateBucket, Contact[]>(
    DATE_BUCKETS.map((bucket) => [bucket, []]),
  );

  contacts.forEach((contact) => {
    const bucket = getContactDateBucket(getContactDate(contact));
    groupedContacts.get(bucket)?.push(contact);
  });

  return DATE_BUCKETS.map((bucket) => ({
    bucket,
    contacts: (groupedContacts.get(bucket) || []).sort((left, right) =>
      (getContactDate(right)?.getTime() ?? 0) - (getContactDate(left)?.getTime() ?? 0),
    ),
  }));
};

const canDeleteContact = (contact: Contact): boolean => {
  if (contact.linkedUserId) return false;
  const createdAt = contact.createdAt;
  const createdAtMs =
    typeof createdAt?.toMillis === "function"
      ? createdAt.toMillis()
      : createdAt instanceof Date
        ? createdAt.getTime()
        : NaN;
  return (
    Number.isFinite(createdAtMs) && Date.now() - createdAtMs < DELETE_WINDOW_MS
  );
};
const canDeleteContactForUser = (
  contact: Contact,
  userId: string | undefined,
  role: string | undefined,
) => canDeleteContact(contact) && (contact.createdById === userId || role === "admin");
const responseLabels: Record<ResponseStatus, string> = {
  pray_receive_christ: "Prayed to receive Christ",
  already_christian: "Already Christian",
  not_ready: "Not ready",
  say_yes_follow_up: "Said yes to follow-up",
};
const ContactAvatar: React.FC<{ gender: Gender }> = ({ gender }) => (
  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary-soft">
    <img
      src={
        gender === "female"
          ? "/Avatar%20-%20Female%20_1.png"
          : "/Avatar%20-%20Male%20_1.png"
      }
      alt={`${gender} avatar`}
      className="h-full w-full object-cover"
    />
  </div>
);
interface MySheepsPageProps {
  onBack?: () => void;
  onFormStateChange?: (isOpen: boolean) => void;
}

export const MySheepsPage: React.FC<MySheepsPageProps> = ({ onBack, onFormStateChange }) => {
  const { user } = useAuth();
  const { myContacts, communityContacts, error, refresh } =
    useContacts();
  const visibleCommunityContacts = communityContacts.filter(
    (contact) => contact.createdById !== user?.uid && !contact.linkedUserId,
  );
  const ownContacts = myContacts.filter(
    (contact) => contact.linkedByUid !== user?.uid,
  );
  const [editing, setEditing] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContactInput>(emptyInput);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [linking, setLinking] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedContact, showForm]);

  useEffect(() => {
    onFormStateChange?.(showForm || Boolean(selectedContact));
  }, [onFormStateChange, selectedContact, showForm]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyInput());
    setSaveError(null);
    setShowForm(true);
  };
  const openEdit = (contact: Contact) => {
    const isLinkedContact = Boolean(contact.linkedUserId);
    if (
      isLinkedContact &&
      contact.linkedByUid !== user?.uid &&
      !window.confirm("This disciple is not under you, continue to edit?")
    ) {
      return;
    }
    setEditing(contact);
    setForm({
      name: contact.name,
      phoneNumber: contact.phoneNumber || "",
      gender: contact.gender,
      gospelStatus: contact.gospelStatus,
      responseStatuses: [...contact.responseStatuses],
      followUpProgress: { ...emptyProgress, ...contact.followUpProgress },
      remarks: contact.remarks || "",
    });
    setSaveError(null);
    setShowForm(true);
  };
  const setStatus = (gospelStatus: GospelStatus) =>
    setForm((current) => ({
      ...current,
      gospelStatus,
      responseStatuses:
        gospelStatus === "not_started" ? [] : current.responseStatuses,
      followUpProgress:
        gospelStatus === "not_started"
          ? { ...emptyProgress }
          : current.followUpProgress,
    }));
  const toggleResponse = (response: ResponseStatus) =>
    setForm((current) => {
      const selected = current.responseStatuses.includes(response);
      const next = selected
        ? current.responseStatuses.filter((item) => item !== response)
        : [...current.responseStatuses, response];
      return {
        ...current,
        responseStatuses:
          response === "not_ready" && !selected
            ? ["not_ready"]
            : response !== "not_ready" &&
                current.responseStatuses.includes("not_ready")
              ? current.responseStatuses.filter(
                  (item) => item !== "not_ready" && item !== response,
                )
              : next,
        followUpProgress:
          response === "say_yes_follow_up" && selected
            ? { ...emptyProgress }
            : current.followUpProgress,
      };
    });
  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyInput());
  };
  const openDetails = (contact: Contact) => {
    setSelectedContact(contact);
  };
  const deleteSelectedContact = async () => {
    if (
      !selectedContact ||
      !canDeleteContactForUser(selectedContact, user?.uid, user?.role)
    )
      return;
    if (
      !window.confirm(`Delete ${selectedContact.name}? This cannot be undone.`)
    )
      return;
    try {
      setLinking(true);
      await deleteContact(selectedContact.id);
      setSelectedContact(null);
      await refresh();
      setSuccess("Contact deleted.");
    } catch (deleteError) {
      console.error("Failed to delete contact:", deleteError);
      setSaveError("Unable to delete this contact.");
    } finally {
      setLinking(false);
    }

  };
  if (selectedContact) {
    return (
      <section className="mx-auto max-w-5xl pb-6">
        <button type="button" onClick={() => setSelectedContact(null)} className="app-button-text -ml-3 mb-5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Sheeps
        </button>
        <div className="border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Contact details</p>
          <h1 className="mt-1 text-2xl font-bold text-text">{selectedContact.name}</h1>
          <p className="mt-1 text-sm text-muted">{selectedContact.phoneNumber || "No phone number recorded"}</p>
        </div>
        <div className="grid gap-4 border-b border-border py-5 text-sm text-text sm:grid-cols-2">
          <p><span className="font-semibold">Gender:</span> {selectedContact.gender === "female" ? "Female" : "Male"}</p>
          <p><span className="font-semibold">Gospel progress:</span> {selectedContact.gospelStatus.replaceAll("_", " ")}</p>
          <p><span className="font-semibold">Responses:</span> {selectedContact.responseStatuses.length ? selectedContact.responseStatuses.map((response) => responseLabels[response]).join(", ") : "None recorded"}</p>
          <p><span className="font-semibold">Created by:</span> {selectedContact.createdByName}</p>
          {/* <p><span className="font-semibold">Account status:</span> {selectedContact.linkedUserId ? "Linked to a CLC account" : "Not linked"}</p> */}
        </div>
        {selectedContact.remarks && (
          <div className="border-b border-border py-5 text-sm text-text">
            <p className="font-semibold">Remarks</p>
            <p className="mt-1 whitespace-pre-wrap text-muted">{selectedContact.remarks}</p>
          </div>
        )}
        {/* <div className="mt-5 border-b border-border pb-5">
          <h2 className="font-semibold text-text">Account Match</h2>
          {matchLoading ? (
            <p className="mt-2 text-sm text-muted">Checking for an exact registered account match...</p>
          ) : selectedContact.linkedUserId ? (
            <div className="mt-3 rounded-app-md border border-primary-muted bg-primary-soft p-3">
              <p className="text-sm font-semibold text-text">Disciple Under: {linkerAccount?.displayName || "the linking user"}</p>
              {(selectedContact.linkedByUid === user?.uid || user?.role === "organizer") && (
                <button type="button" disabled={linking} onClick={() => void unlinkSelectedContact()} className="app-button-secondary mt-3">
                  <Unlink className="h-4 w-4" />
                  {linking ? "Unlinking..." : "Unlink Disciple"}
                </button>
              )}
            </div>
          ) : accountMatch ? (
            <div className="mt-3 rounded-app-md border border-primary-muted bg-primary-soft p-3">
              <p className="text-sm font-semibold text-text">Selected student: {accountMatch.displayName}</p>
              <button type="button" disabled={linking || (selectedContact.createdById !== user?.uid && user?.role !== "organizer")} onClick={() => void linkSelectedContact()} className="app-button-primary mt-3">
                <Link2 className="h-4 w-4" />
                {linking ? "Linking..." : `Disciple ${selectedContact.gender === "female" ? "her" : "him"}`}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <UserSearchInput
                currentUserId={user?.uid || ""}
                onSelectUser={(selected) => setAccountMatch(selected ? { ...selected, photoURL: "" } : null)}
                eligibleRoles={DISCIPLE_ELIGIBLE_ROLES as unknown as ("student" | "organizer")[]}
              />
            </div>
          )}
        </div> */}
        {canDeleteContactForUser(selectedContact, user?.uid, user?.role) && (
          <button type="button" disabled={linking} onClick={() => void deleteSelectedContact()} className="app-button-secondary mt-5 w-full text-danger">
            <Trash2 className="h-4 w-4" />
            {linking ? "Deleting..." : "Delete Contact"}
          </button>
        )}
      </section>
    );
  }
  const deleteEditingContact = async () => {
    if (!editing || !canDeleteContactForUser(editing, user?.uid, user?.role)) return;
    if (!window.confirm(`Delete ${editing.name}? This cannot be undone.`))
      return;
    try {
      setSaving(true);
      await deleteContact(editing.id);
      closeForm();
      await refresh();
      setSuccess("Contact deleted.");
    } catch (deleteError) {
      console.error("Failed to delete contact:", deleteError);
      setSaveError("Unable to delete this contact.");
    } finally {
      setSaving(false);
    }
  };
  const save = async (addAnother: boolean) => {
    if (!user || !form.name.trim()) return;
    try {
      setSaving(true);
      setSaveError(null);
      setSuccess(null);
      if (editing)
        await updateContact(
          editing.id,
          form,
          editing.createdById,
          editing.createdByName,
        );
      else await createContact(form, user.uid, user.displayName);
      await refresh();
      if (addAnother && !editing) {
        setForm(emptyInput());
        setSuccess("Contact saved. Add another sheep.");
        setTimeout(() => nameRef.current?.focus(), 0);
      } else closeForm();
    } catch (saveError) {
      console.error("Failed to save contact:", saveError);
      setSaveError("Unable to save this contact. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const renderContact = (contact: Contact, community = false) => (
    <article
      key={contact.id}
      className="flex items-center gap-3 border-b border-border py-3 last:border-0"
    >
      <ContactAvatar gender={contact.gender} />
      <button
        type="button"
        onClick={() => void openDetails(contact)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate font-semibold text-text">{contact.name}</p>
        <p className="text-xs text-muted">
          {community
            ? `Added by ${contact.createdByName}`
            : responseLabels[contact.responseStatuses[0]] || "Outreach contact"}
        </p>
        <p className="mt-1 text-xs font-medium text-text">
          {getContactDate(contact)?.toLocaleDateString("en-GB") || "Date unavailable"}
        </p>
        {contact.linkedUserId && (
          <p className="text-xs font-semibold text-primary">CLC Friends</p>
        )}
      </button>
      {(contact.createdById === user?.uid ||
        contact.linkedByUid === user?.uid ||
        user?.role === "organizer") && (
        <button
          type="button"
          onClick={() => openEdit(contact)}
          className="app-icon-button size-9"
          title="Edit contact"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      )}
    </article>
  );

  const renderDateSection = (title: string, contacts: Contact[], community = false) => (
    <section key={title}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text">{title}</h3>
        <span className="text-xs text-muted">{contacts.length}</span>
      </div>
      {contacts.length === 0 ? (
        <p className="border-y border-border py-8 text-center text-sm text-muted">
          No contacts in this group.
        </p>
      ) : (
        <div className="mt-2 space-y-5">
          {getDateGroups(contacts).map(({ bucket, contacts: bucketContacts }) => bucketContacts.length > 0 && (
            <div key={bucket}>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-semibold text-text">{bucket}</h4>
                <span className="text-xs text-muted">{bucketContacts.length}</span>
              </div>
              <div className="divide-y divide-border">
                {bucketContacts.map((contact) => renderContact(contact, community))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
    <section className={`space-y-6 ${showForm ? "hidden" : ""}`}>
      {onBack && (
        <button type="button" onClick={onBack} className="app-button-text -ml-3">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Friends
        </button>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-3">
            Outreach contacts
          </p>
          <h2 className="mt-1 text-2xl font-bold text-text">My Sheeps</h2>
          <p className="mt-1 text-sm text-muted">
            Keep track of the people you met and key in the next faithful step.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="app-button-primary size-11 min-h-0 shrink-0 rounded-full p-0 shadow-app-md transition-transform hover:scale-105"
          title="Add contact"
          aria-label="Add contact"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {success && <div className="app-alert-success">{success}</div>}
      {(error || saveError) && (
        <div className="app-alert-error">{error || saveError}</div>
      )}
      <div className="space-y-8">
        {renderDateSection("My Contacts", ownContacts)}
        {renderDateSection("Community Contacts", visibleCommunityContacts, true)}
      </div>
    </section>
      {showForm && (
        <section className="page-view-fade mx-auto max-w-5xl pb-6">
          <button type="button" onClick={closeForm} className="app-button-text -ml-3 mb-5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to My Sheeps
          </button>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save(false);
            }}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h1 className="text-2xl font-bold text-text">
                {editing ? "Edit Contact" : "New Contact"}
              </h1>
              {/* <button
                type="button"
                onClick={closeForm}
                className="app-icon-button size-9"
              >
                &times;
              </button> */}
            </div>
            <label className="mt-4 block">
              <span className="app-label">Name</span>
              <input
                ref={nameRef}
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="app-input"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label>
                <span className="app-label">Phone</span>
                <input
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm({ ...form, phoneNumber: event.target.value })
                  }
                  className="app-input"
                />
              </label>
              <label>
                <span className="app-label">Gender</span>
                <select
                  value={form.gender}
                  onChange={(event) =>
                    setForm({ ...form, gender: event.target.value as Gender })
                  }
                  className="app-input"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
            </div>
            <label className="mt-3 block">
              <span className="app-label">Gospel progress</span>
              <select
                value={form.gospelStatus}
                onChange={(event) =>
                  setStatus(event.target.value as GospelStatus)
                }
                className="app-input"
              >
                <option value="not_started">Not started</option>
                <option value="gospel_conversation">Gospel conversation</option>
                <option value="gospel_presentation">Gospel presentation</option>
              </select>
            </label>
            {form.gospelStatus !== "not_started" && (
              <div className="mt-4">
                <span className="app-label">Response</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(responseLabels) as ResponseStatus[]).map(
                    (response) => (
                      <label
                        key={response}
                        className="flex items-center gap-2 text-sm text-text"
                      >
                        <input
                          type="checkbox"
                          checked={form.responseStatuses.includes(response)}
                          disabled={
                            response !== "not_ready" &&
                            form.responseStatuses.includes("not_ready")
                          }
                          onChange={() => toggleResponse(response)}
                        />
                        {responseLabels[response]}
                      </label>
                    ),
                  )}
                </div>
              </div>
            )}
            {form.responseStatuses.includes("say_yes_follow_up") && (
              <div className="mt-4">
                <span className="app-label">Journey of Faith progress</span>
                {JOURNEY_OF_FAITH_STEPS.map((step) => (
                  <label
                    key={step}
                    className="mt-2 flex items-center gap-2 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      checked={form.followUpProgress[step]}
                      onChange={() =>
                        setForm({
                          ...form,
                          followUpProgress: {
                            ...form.followUpProgress,
                            [step]: !form.followUpProgress[step],
                          },
                        })
                      }
                    />
                    {step.replace("_", " ").toUpperCase()}
                  </label>
                ))}
              </div>
            )}
            <label className="mt-4 block">
              <span className="app-label">Remarks</span>
              <textarea
                rows={3}
                value={form.remarks}
                onChange={(event) =>
                  setForm({ ...form, remarks: event.target.value })
                }
                className="app-input"
              />
            </label>
            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="app-button-secondary"
              >
                Cancel
              </button>
              {editing && canDeleteContactForUser(editing, user?.uid, user?.role) && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void deleteEditingContact()}
                  className="app-button-secondary text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  {saving ? "Deleting..." : "Delete Contact"}
                </button>
              )}
              {!editing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save(true)}
                  className="app-button-secondary"
                >
                  {saving ? "Saving..." : "Save & Add Another"}
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="app-button-primary"
              >
                {saving ? "Saving..." : "Save & Close"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
};
