import { useEffect, useState } from "react";
import { Plus, CheckCircle2, AlertCircle, Wrench, GripVertical } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Modal } from "../components/Modal";
import { getMaintenanceIssues, getRooms, updateMaintenanceStatus, createMaintenanceIssue } from "../lib/api";
import { MaintenanceIssueStatus, MaintenanceIssuePriority } from "../lib/types";
import type { MaintenanceIssue, Room } from "../lib/types";

export function AdminMaintenancePage() {
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [roomsDict, setRoomsDict] = useState<Record<string, string>>({});
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [newPriority, setNewPriority] = useState<number>(MaintenanceIssuePriority.Low);
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedOverCol, setDraggedOverCol] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getMaintenanceIssues(), getRooms(true)]).then(([issuesData, roomsData]) => {
      setIssues(issuesData);
      setRoomsList(roomsData);
      
      const roomMap: Record<string, string> = {};
      roomsData.forEach(r => roomMap[r.id] = r.name);
      setRoomsDict(roomMap);
      
      setLoading(false);
    });
  }, []);

  const handleUpdateStatus = (id: string, newStatus: number) => {
    updateMaintenanceStatus(id, newStatus).then(updated => {
      setIssues(prev => prev.map(issue => issue.id === updated.id ? updated : issue));
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("issueId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedOverCol !== status) {
      setDraggedOverCol(status);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: number) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const id = e.dataTransfer.getData("issueId");
    if (id) {
      const issue = issues.find(i => i.id === id);
      if (issue && issue.status !== targetStatus) {
        handleUpdateStatus(id, targetStatus);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverCol(null);
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId || !newDescription) return;
    
    setIsSubmitting(true);
    try {
      const issue = await createMaintenanceIssue({
        roomId: newRoomId,
        priority: newPriority,
        description: newDescription
      });
      setIssues(prev => [issue, ...prev]);
      setIsModalOpen(false);
      setNewRoomId("");
      setNewDescription("");
      setNewPriority(MaintenanceIssuePriority.Low);
    } catch (err) {
      console.error(err);
      alert("Failed to log issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case MaintenanceIssuePriority.High:
        return <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">High Priority</span>;
      case MaintenanceIssuePriority.Medium:
        return <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">Medium</span>;
      default:
        return <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">Low Priority</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium animate-pulse">Loading maintenance issues...</p>
        </div>
      </div>
    );
  }

  const openIssues = issues.filter(i => i.status === MaintenanceIssueStatus.Open);
  const inProgressIssues = issues.filter(i => i.status === MaintenanceIssueStatus.InProgress);
  const resolvedIssues = issues.filter(i => i.status === MaintenanceIssueStatus.Resolved);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Maintenance Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and resolve user-reported room issues.</p>
        </div>
        <Button className="gap-2 h-9 text-xs" onClick={() => setIsModalOpen(true)}>
          <Plus className="size-3.5" /> Log Issue
        </Button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 items-stretch min-h-[600px] pb-6">
        {/* Open Issues */}
        <div 
          className={`flex flex-col rounded-xl transition-all ${draggedOverCol === MaintenanceIssueStatus.Open ? 'bg-muted/80 ring-2 ring-primary/20' : 'bg-muted/40 border border-border/50'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.Open)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.Open)}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between p-4 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-background shadow-xs border border-border">
                <AlertCircle className="size-3.5 text-rose-500" />
              </span>
              Open
            </h3>
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium text-muted-foreground shadow-xs">
              {openIssues.length}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-3 px-3 pb-3">
            {openIssues.map(issue => (
              <div 
                key={issue.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, issue.id)}
                className="group relative flex cursor-grab flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  {getPriorityBadge(issue.priority as number)}
                  <span className="font-mono text-[10px] text-muted-foreground">#{issue.id.substring(0, 8)}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-foreground">{issue.description}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
                </div>
                <div className="mt-1 flex items-center justify-between pt-3 border-t border-border/50">
                  <GripVertical className="size-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-semibold transition-colors hover:bg-primary hover:text-primary-foreground" onClick={() => handleUpdateStatus(issue.id, MaintenanceIssueStatus.InProgress)}>
                    Start Work
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div 
          className={`flex flex-col rounded-xl transition-all ${draggedOverCol === MaintenanceIssueStatus.InProgress ? 'bg-muted/80 ring-2 ring-primary/20' : 'bg-muted/40 border border-border/50'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.InProgress)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.InProgress)}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between p-4 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-background shadow-xs border border-border">
                <Wrench className="size-3.5 text-amber-500" />
              </span>
              In Progress
            </h3>
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium text-muted-foreground shadow-xs">
              {inProgressIssues.length}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-3 px-3 pb-3">
            {inProgressIssues.map(issue => (
              <div 
                key={issue.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, issue.id)}
                className="group relative flex cursor-grab flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  {getPriorityBadge(issue.priority as number)}
                  <span className="font-mono text-[10px] text-muted-foreground">#{issue.id.substring(0, 8)}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-foreground">{issue.description}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
                </div>
                <div className="mt-1 flex items-center justify-between pt-3 border-t border-border/50">
                  <GripVertical className="size-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-semibold transition-colors hover:bg-emerald-500 hover:text-white" onClick={() => handleUpdateStatus(issue.id, MaintenanceIssueStatus.Resolved)}>
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolved */}
        <div 
          className={`flex flex-col rounded-xl transition-all ${draggedOverCol === MaintenanceIssueStatus.Resolved ? 'bg-muted/80 ring-2 ring-primary/20' : 'bg-muted/40 border border-border/50'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.Resolved)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.Resolved)}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between p-4 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <span className="flex size-6 items-center justify-center rounded-md bg-background shadow-xs border border-border">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              </span>
              Resolved
            </h3>
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-background border border-border text-xs font-medium text-muted-foreground shadow-xs">
              {resolvedIssues.length}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-3 px-3 pb-3">
            {resolvedIssues.map(issue => (
              <div 
                key={issue.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, issue.id)}
                className="group relative flex cursor-grab flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm opacity-60 transition-all hover:border-primary/40 hover:shadow-md hover:opacity-100 active:cursor-grabbing"
              >
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                    <CheckCircle2 className="size-3" /> Done
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">#{issue.id.substring(0, 8)}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-muted-foreground line-through">{issue.description}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="border-b border-border pb-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Report Maintenance Issue</h2>
            <p className="text-sm text-muted-foreground">Log a new issue for a room that needs attention.</p>
          </div>
          <form onSubmit={handleCreateIssue} className="space-y-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={newRoomId} onValueChange={(val) => setNewRoomId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {roomsList.map(room => (
                    <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newPriority.toString()} onValueChange={(val) => setNewPriority(parseInt(val || "0"))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MaintenanceIssuePriority.Low.toString()}>Low Priority</SelectItem>
                  <SelectItem value={MaintenanceIssuePriority.Medium.toString()}>Medium Priority</SelectItem>
                  <SelectItem value={MaintenanceIssuePriority.High.toString()}>High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Broken projector cable"
                required
              />
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !newRoomId || !newDescription}>
                {isSubmitting ? "Logging..." : "Log Issue"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
