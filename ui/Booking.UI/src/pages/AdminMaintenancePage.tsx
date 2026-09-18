import { useEffect, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 shadow-none">High Priority</Badge>;
      case MaintenanceIssuePriority.Medium:
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-none">Medium</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-none">Low</Badge>;
    }
  };

  if (loading) return <div>Loading maintenance issues...</div>;

  const openIssues = issues.filter(i => i.status === MaintenanceIssueStatus.Open);
  const inProgressIssues = issues.filter(i => i.status === MaintenanceIssueStatus.InProgress);
  const resolvedIssues = issues.filter(i => i.status === MaintenanceIssueStatus.Resolved);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Maintenance Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and resolve user-reported room issues.</p>
        </div>
        <Button className="gap-2 h-9 text-xs" onClick={() => setIsModalOpen(true)}>
          <Plus className="size-3.5" /> Log Issue
        </Button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Open Issues */}
        <div 
          className={`space-y-4 rounded-xl p-4 border transition-all ${draggedOverCol === MaintenanceIssueStatus.Open ? 'bg-rose-500/10 border-rose-500/40' : 'bg-rose-500/5 border-rose-500/20'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.Open)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.Open)}
          onDragLeave={handleDragLeave}
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-950 dark:text-rose-200 px-1 mb-5">
            <Badge variant="destructive" className="flex size-5 p-0 items-center justify-center rounded-full text-xs shadow-none">{openIssues.length}</Badge>
            Open
          </h3>
          {openIssues.map(issue => (
            <div 
              key={issue.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, issue.id)}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 cursor-grab active:cursor-grabbing hover:border-rose-500/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                {getPriorityBadge(issue.priority as number)}
                <span className="text-xs text-muted-foreground">#{issue.id.substring(0, 8)}</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">{issue.description}</h4>
                <p className="text-xs text-muted-foreground mt-1">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleUpdateStatus(issue.id, MaintenanceIssueStatus.InProgress)}>Start</Button>
              </div>
            </div>
          ))}
        </div>

        {/* In Progress */}
        <div 
          className={`space-y-4 rounded-xl p-4 border transition-all ${draggedOverCol === MaintenanceIssueStatus.InProgress ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-500/5 border-amber-500/20'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.InProgress)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.InProgress)}
          onDragLeave={handleDragLeave}
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-950 dark:text-amber-200 px-1 mb-5">
            <Badge variant="outline" className="flex size-5 p-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs shadow-none">{inProgressIssues.length}</Badge>
            In Progress
          </h3>
          {inProgressIssues.map(issue => (
            <div 
              key={issue.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, issue.id)}
              className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 cursor-grab active:cursor-grabbing hover:border-amber-500/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                {getPriorityBadge(issue.priority as number)}
                <span className="text-xs text-muted-foreground">#{issue.id.substring(0, 8)}</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">{issue.description}</h4>
                <p className="text-xs text-muted-foreground mt-1">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleUpdateStatus(issue.id, MaintenanceIssueStatus.Resolved)}>Resolve</Button>
              </div>
            </div>
          ))}
        </div>

        {/* Resolved */}
        <div 
          className={`space-y-4 rounded-xl p-4 border transition-all ${draggedOverCol === MaintenanceIssueStatus.Resolved ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-500/5 border-emerald-500/20'}`}
          onDragOver={(e) => handleDragOver(e, MaintenanceIssueStatus.Resolved)}
          onDrop={(e) => handleDrop(e, MaintenanceIssueStatus.Resolved)}
          onDragLeave={handleDragLeave}
        >
          <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-950 dark:text-emerald-200 px-1 mb-5">
            <Badge variant="outline" className="flex size-5 p-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs shadow-none">{resolvedIssues.length}</Badge>
            Resolved
          </h3>
          {resolvedIssues.map(issue => (
            <div 
              key={issue.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, issue.id)}
              className="rounded-xl border border-border bg-card p-4 shadow-sm opacity-70 cursor-grab active:cursor-grabbing hover:opacity-100 hover:border-emerald-500/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none gap-1 pr-2">
                  <CheckCircle2 className="size-3" /> Done
                </Badge>
                <span className="text-xs text-muted-foreground">#{issue.id.substring(0, 8)}</span>
              </div>
              <div>
                <h4 className="font-medium text-sm">{issue.description}</h4>
                <p className="text-xs text-muted-foreground mt-1">Room: {roomsDict[issue.roomId] || "Unknown"}</p>
              </div>
            </div>
          ))}
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
