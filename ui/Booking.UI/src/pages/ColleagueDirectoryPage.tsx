import { useEffect, useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, User, ArrowLeft } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { getDirectory } from "../lib/api";
import type { ColleagueDirectoryItem } from "../lib/types";
import { Link } from "react-router-dom";
import { getAvatar } from "../lib/avatar";

export function ColleagueDirectoryPage() {
  const [colleagues, setColleagues] = useState<ColleagueDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getDirectory().then(res => {
      setColleagues(res.sort((a, b) => a.username.localeCompare(b.username)));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return colleagues.filter(c => 
      c.username.toLowerCase().includes(search.toLowerCase()) || 
      (c.department && c.department.toLowerCase().includes(search.toLowerCase()))
    );
  }, [colleagues, search]);

  // Reset page to 1 when searching
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
          <p className="text-sm font-medium animate-pulse">Loading directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <Link
            to="/"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to calendar</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Find colleagues and see their current availability.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search coworkers..." 
            className="pl-9 bg-card h-9 shadow-sm" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      {/* Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Colleague</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4 w-[200px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((colleague) => (
                <tr key={colleague.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-white ring-1 ring-primary/20 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                        <img src={getAvatar(colleague.username)} alt={colleague.username} className="h-full w-full object-cover" />
                      </div>
                      <span className="font-semibold text-foreground">{colleague.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {colleague.department || "No Department"}
                  </td>
                  <td className="px-6 py-4">
                    {colleague.isAvailable ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                        <span className="relative flex size-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        AVAILABLE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
                        <span className="flex size-1.5 rounded-full bg-rose-500" />
                        IN A MEETING
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No colleagues found.</p>
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
    </div>
  );
}
