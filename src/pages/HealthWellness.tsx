import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, LogOut } from "lucide-react";
import { format, isWithinInterval, subDays, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { FilterMenu } from "@/components/FilterMenu";

interface HealthMention {
  id: string;
  content: string;
  created_at: string;
}

export default function HealthWellness() {
  const [healthMentions, setHealthMentions] = useState<HealthMention[]>([]);
  const [filteredHealthMentions, setFilteredHealthMentions] = useState<HealthMention[]>([]);
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
    fetchHealthMentions();
  }, []);

  useEffect(() => {
    let filtered = healthMentions.filter((mention) =>
      mention.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((mention) => {
        const mentionDate = new Date(mention.created_at);
        switch (dateFilter) {
          case "today":
            return isWithinInterval(mentionDate, { start: startOfDay(now), end: now });
          case "week":
            return isWithinInterval(mentionDate, { start: subDays(now, 7), end: now });
          case "month":
            return isWithinInterval(mentionDate, { start: subDays(now, 30), end: now });
          default:
            return true;
        }
      });
    }

    setFilteredHealthMentions(filtered);
  }, [healthMentions, searchQuery, dateFilter]);

  const fetchHealthMentions = async () => {
    try {
      const { data, error } = await supabase
        .from("health_mentions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHealthMentions(data || []);
    } catch (error) {
      console.error("Error fetching health mentions:", error);
      toast({
        title: "Error",
        description: "Failed to load health mentions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold mb-6">Health & Wellness</h1>
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Health Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHealthMentions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {healthMentions.length === 0 ? "No health mentions yet" : "No mentions match your search"}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredHealthMentions.map((mention) => (
                <div key={mention.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <p className="text-sm whitespace-pre-wrap">{mention.content}</p>
                </div>
              ))}
            </div>
          )}
            </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
