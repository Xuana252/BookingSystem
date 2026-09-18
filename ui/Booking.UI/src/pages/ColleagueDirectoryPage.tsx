import { useEffect, useState } from "react";
import { Search, UserCircle } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { getDirectory } from "../lib/api";
import type { ColleagueDirectoryItem } from "../lib/types";

export function ColleagueDirectoryPage() {
  const [colleagues, setColleagues] = useState<ColleagueDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDirectory().then(res => {
      setColleagues(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading directory...</div>;

  const filtered = colleagues.filter(c => c.username.toLowerCase().includes(search.toLowerCase()) || c.department.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Find colleagues and see their current availability.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search coworkers..." 
            className="pl-9 bg-card h-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Colleague</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium w-[150px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((colleague) => (
                <tr key={colleague.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserCircle className="size-8 text-muted-foreground/30" />
                      <span className="font-medium text-foreground">{colleague.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {colleague.department || "No Department"}
                  </td>
                  <td className="px-4 py-3">
                    {colleague.isAvailable ? (
                      <Badge variant="outline" className="gap-1.5 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 font-medium whitespace-nowrap">
                        <span className="flex size-1.5 rounded-full bg-emerald-500"></span>
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 text-rose-600 bg-rose-500/10 border-rose-500/20 font-medium whitespace-nowrap">
                        <span className="flex size-1.5 rounded-full bg-rose-500"></span>
                        In a Meeting
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No colleagues found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
