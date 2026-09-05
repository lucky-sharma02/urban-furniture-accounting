import type { ContactType } from "@urban-furniture/shared";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/lib/api/contacts";
import { Mail, Phone, Edit, Archive } from "lucide-react";

const COLUMNS: ContactType[] = ["Vendor", "Customer", "Both"];

interface ContactKanbanBoardProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onArchive: (id: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContactKanbanBoard({ contacts, onEdit, onArchive }: ContactKanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {COLUMNS.map((type) => {
        const columnContacts = contacts.filter((contact) => contact.type === type);
        return (
          <div key={type} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  type === "Customer" ? "bg-emerald-600" : type === "Vendor" ? "bg-blue-600" : "bg-purple-600"
                }`} />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-display">
                  {type}s
                </h2>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                {columnContacts.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {columnContacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No {type.toLowerCase()} entities added
                </div>
              ) : (
                columnContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-4 shadow-card hover:shadow-card-hover transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
                        {getInitials(contact.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{contact.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {contact.id.slice(-6)}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(contact)} className="h-7 text-xs px-2 text-slate-700 hover:bg-slate-100">
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onArchive(contact.id)} className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50">
                        <Archive className="h-3 w-3 mr-1" /> Archive
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

