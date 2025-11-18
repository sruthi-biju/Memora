import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, ArrowLeft, LogOut, Plus } from "lucide-react";
import { format, isWithinInterval, subDays, startOfDay, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { FilterMenu } from "@/components/FilterMenu";
import { ZenCharacter } from "@/components/ZenCharacter";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string | null;
  event_time: string | null;
  created_at: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", event_time: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    fetchEvents();
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_google_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setIsGoogleConnected(!!data && !error);
    } catch (error) {
      console.error("Error checking Google connection:", error);
    }
  };

  const connectGoogleCalendar = async () => {
    toast({
      title: "Coming Soon",
      description: "Google Calendar integration requires additional OAuth setup. Please add your Google Client ID and Secret to enable this feature.",
    });
  };

  useEffect(() => {
    let filtered = events.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((event) => {
        if (!event.event_date) return false;
        const eventDate = new Date(event.event_date);
        if (timeFilter === "upcoming") {
          return !isBefore(eventDate, startOfDay(now));
        } else if (timeFilter === "past") {
          return isBefore(eventDate, startOfDay(now));
        }
        return true;
      });
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, timeFilter]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("event_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: "Error",
        description: "Event title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: newEvent.title,
          event_date: newEvent.event_date || null,
          event_time: newEvent.event_time || null,
          user_id: user.id,
          google_calendar_sync_enabled: syncEnabled && isGoogleConnected,
        })
        .select()
        .single();

      if (error) throw error;

      // Sync with Google Calendar if enabled
      if (syncEnabled && isGoogleConnected && data) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await supabase.functions.invoke("google-calendar-sync", {
            body: {
              action: "create",
              eventData: data,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });

          if (response.data?.googleCalendarId) {
            await supabase
              .from("calendar_events")
              .update({ google_calendar_id: response.data.googleCalendarId })
              .eq("id", data.id);
          }
        } catch (syncError) {
          console.error("Error syncing with Google Calendar:", syncError);
          toast({
            title: "Partial Success",
            description: "Event created but Google Calendar sync failed",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: syncEnabled && isGoogleConnected 
          ? "Event added and synced to Google Calendar" 
          : "Event added successfully",
      });

      setNewEvent({ title: "", event_date: "", event_time: "" });
      setIsAdding(false);
      fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Error",
        description: "Failed to add event",
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
                  onFilterChange={(type, value) => setTimeFilter(value)}
                  filters={[
                    {
                      label: "Time Period",
                      type: "time",
                      options: [
                        { label: "All Events", value: "all" },
                        { label: "Upcoming", value: "upcoming" },
                        { label: "Past", value: "past" },
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Calendar Events</h1>
              <Button onClick={() => setIsAdding(!isAdding)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>

            {isAdding && (
              <Card className="mb-6 border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-foreground">Add New Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Title</Label>
                    <Input
                      id="event-title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Enter event title"
                      className="border-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      className="border-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-time">Time</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={newEvent.event_time}
                      onChange={(e) => setNewEvent({ ...newEvent, event_time: e.target.value })}
                      className="border-primary/30"
                    />
                  </div>
                  {isGoogleConnected && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <Label htmlFor="sync-google" className="cursor-pointer">
                        Sync with Google Calendar
                      </Label>
                      <Switch
                        id="sync-google"
                        checked={syncEnabled}
                        onCheckedChange={setSyncEnabled}
                      />
                    </div>
                  )}
                  {!isGoogleConnected && (
                    <Button
                      variant="outline"
                      onClick={connectGoogleCalendar}
                      className="w-full"
                    >
                      Connect Google Calendar
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={addEvent} className="bg-primary hover:bg-primary/90">Add</Button>
                    <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Your Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌸</div>
              <p className="text-muted-foreground">
                {events.length === 0 ? "No calendar events yet. Start by adding one!" : "No events match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="p-4 rounded-xl border-2 border-primary/10 bg-gradient-to-br from-card to-accent/20 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{event.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            🗓️ {format(new Date(event.event_date), "MMMM d, yyyy")}
                          </span>
                        )}
                        {event.event_time && (
                          <span className="flex items-center gap-1">
                            ⏰ {event.event_time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </CardContent>
            </Card>
            <ZenCharacter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
