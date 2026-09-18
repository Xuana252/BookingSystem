import { useEffect, useState } from "react";
import { Search, Filter, Eye } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Modal } from "../components/Modal";
import { getAuditLogs, getUsers } from "../lib/api";
import type { AuditLog } from "../lib/types";

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    Promise.all([getAuditLogs(), getUsers()]).then(([logsData, usersData]) => {
      setLogs(logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      const userMap: Record<string, string> = {};
      usersData.forEach(u => userMap[u.id] = u.username);
      setUsers(userMap);
      
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading audit logs...</div>;

  const formatDetails = (details: string) => {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Security and system activity history.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search logs..." className="pl-9 bg-card h-9" />
          </div>
          <Button variant="outline" size="sm" className="h-9"><Filter className="size-4 mr-2" /> Filter</Button>
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.userId ? (users[log.userId] || log.userId) : "System"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`font-medium ${
                      log.actionType === 'Deleted' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 
                      log.actionType === 'Added' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      {log.actionType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{log.entityName}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setSelectedLog(log)}>
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
