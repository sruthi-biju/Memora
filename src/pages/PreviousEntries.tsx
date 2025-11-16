import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, LogOut } from "lucide-react";
import { format, isWithinInterval, subDays, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { FilterMenu } from "@/components/FilterMenu";

interface JournalEntry {
  id: string;
  content: string;
  created_at: string;
}

export default function PreviousEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    let filtered = entries.filter((entry) =>
      entry.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.created_at);
        switch (dateFilter) {
          case "today":
            return isWithinInterval(entryDate, { start: startOfDay(now), end: now });
          case "week":
            return isWithinInterval(entryDate, { start: subDays(now, 7), end: now });
          case "month":
            return isWithinInterval(entryDate, { start: subDays(now, 30), end: now });
          default:
            return true;
        }
      });
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, dateFilter]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setEntries(entries.filter(entry => entry.id !== id));
      toast({
        title: "Success",
        description: "Journal entry deleted",
      });
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <FilterMenu
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  onFilterChange={(type, value) => setDateFilter(value)}
                  filters={[
                    {
                      label: "Date Range",
                      type: "date",
                      options: [
                        { label: "All Time", value: "all" },
                        { label: "Today", value: "today" },
                        { label: "Last 7 Days", value: "week" },
                        { label: "Last 30 Days", value: "month" },
                      ],
                    },
                  ]}
                />
                <Button variant="outline" onClick={handleSignOut} size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Previous Journal Entries</h1>
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                {entries.length === 0 ? "No journal entries yet" : "No entries match your search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteEntry(entry.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
              </CardContent>
            </Card>
          ))
        )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
