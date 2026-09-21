import { useEffect, useState, useMemo } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Modal } from "../components/Modal";
import { getAuditLogs, getUsers } from "../lib/api";
import type { AuditLog } from "../lib/types";
import { Link } from "react-router-dom";

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    Promise.all([getAuditLogs(), getUsers()]).then(([logsData, usersData]) => {
      setLogs(logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      const userMap: Record<string, string> = {};
      usersData.forEach(u => userMap[u.id] = u.username);
      setUsers(userMap);
      
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const username = log.userId ? (users[log.userId] || log.userId) : "System";
      const term = search.toLowerCase();
      return (
        username.toLowerCase().includes(term) ||
        log.actionType.toLowerCase().includes(term) ||
        log.entityName.toLowerCase().includes(term)
      );
    });
  }, [logs, search, users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium animate-pulse">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  const formatDetails = (details: string) => {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to calendar</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Security and system activity history.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search logs..." 
              className="pl-9 bg-card h-9 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-[13px] font-medium">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {log.userId ? (users[log.userId] || log.userId) : "System"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold ring-1 ring-inset ${
                      log.actionType === 'Deleted' ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20' : 
                      log.actionType === 'Added' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20' : 
                      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20'
                    }`}>
                      {log.actionType.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-[13px] font-medium">{log.entityName}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => setSelectedLog(log)}>
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No audit logs found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-3">
            <p className="text-xs text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, filtered.length)}</span> of <span className="font-bold text-foreground">{filtered.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 border-border bg-card shadow-xs"
              >
                <ChevronLeft className="size-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 border-border bg-card shadow-xs"
              >
                Next
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <Modal onClose={() => setSelectedLog(null)}>
          <div className="border-b border-border pb-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Audit Log Details</h2>
            <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
              <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
              <span>&bull;</span>
              <span>User: {selectedLog.userId ? (users[selectedLog.userId] || selectedLog.userId) : "System"}</span>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono text-muted-foreground">
            <pre>
              {formatDetails(selectedLog.details)}
            </pre>
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setSelectedLog(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
