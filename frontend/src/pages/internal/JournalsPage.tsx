import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JournalFormDialog } from "@/components/master-data/JournalFormDialog";
import { archiveJournal, listJournals, type Journal } from "@/lib/api/journals";

export function JournalsPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<Journal | undefined>(undefined);

  async function load() {
    setLoading(true);
    const data = await listJournals();
    setJournals(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleArchive(id: string) {
    await archiveJournal(id);
    load();
  }

  function openCreateForm() {
    setEditingJournal(undefined);
    setFormOpen(true);
  }

  function openEditForm(journal: Journal) {
    setEditingJournal(journal);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Journals</h1>
        <Button onClick={openCreateForm}>New Journal</Button>
      </div>

      <JournalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        journal={editingJournal}
        onSaved={load}
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : journals.length === 0 ? (
        <p className="text-muted-foreground">No journals yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journals.map((journal) => (
              <TableRow key={journal.id}>
                <TableCell className="font-medium">{journal.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{journal.type}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(journal)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(journal.id)}>
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
