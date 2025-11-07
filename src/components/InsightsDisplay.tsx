import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Calendar, StickyNote, Heart, Trash2, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string | null;
  event_time: string | null;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface HealthMention {
  id: string;
  content: string;
  created_at: string;
}

interface InsightsDisplayProps {
  refreshTrigger: number;
}

export const InsightsDisplay = ({ refreshTrigger }: InsightsDisplayProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [health, setHealth] = useState<HealthMention[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksData, eventsData, notesData, healthData] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").eq("user_id", user.id).order("event_date", { ascending: true }),
      supabase.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("health_mentions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    if (tasksData.data) setTasks(tasksData.data);
    if (eventsData.data) setEvents(eventsData.data);
    if (notesData.data) setNotes(notesData.data);
    if (healthData.data) setHealth(healthData.data);
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase.from("tasks").update({ completed: !completed }).eq("id", taskId);
    fetchData();
  };

  const startEdit = (id: string, type: string, currentValue: string) => {
    setEditingId(id);
    setEditingType(type);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingId || !editingType) return;

    try {
      let error;
      if (editingType === "tasks") {
        const result = await supabase.from("tasks").update({ title: editValue }).eq("id", editingId);
        error = result.error;
      } else if (editingType === "calendar_events") {
        const result = await supabase.from("calendar_events").update({ title: editValue }).eq("id", editingId);
        error = result.error;
      } else if (editingType === "notes") {
        const result = await supabase.from("notes").update({ content: editValue }).eq("id", editingId);
        error = result.error;
      } else if (editingType === "health_mentions") {
        const result = await supabase.from("health_mentions").update({ content: editValue }).eq("id", editingId);
        error = result.error;
      }

      if (error) throw error;

      toast({ title: "Updated successfully" });
      cancelEdit();
      fetchData();
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const deleteItem = async (id: string, type: "tasks" | "calendar_events" | "notes" | "health_mentions") => {
    try {
      let error;
      if (type === "tasks") {
        const result = await supabase.from("tasks").delete().eq("id", id);
        error = result.error;
      } else if (type === "calendar_events") {
        const result = await supabase.from("calendar_events").delete().eq("id", id);
        error = result.error;
      } else if (type === "notes") {
        const result = await supabase.from("notes").delete().eq("id", id);
        error = result.error;
      } else if (type === "health_mentions") {
        const result = await supabase.from("health_mentions").delete().eq("id", id);
        error = result.error;
      }

      if (error) throw error;

      toast({ title: "Deleted successfully" });
      fetchData();
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-accent text-accent-foreground";
      case "medium":
        return "bg-primary/20 text-primary";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Tasks */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-[var(--transition-smooth)]"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id, task.completed)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  {editingId === task.id && editingType === "tasks" ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                  )}
                  <Badge className={getPriorityColor(task.priority)} variant="secondary">
                    {task.priority}
                  </Badge>
                </div>
                {editingId !== task.id && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(task.id, "tasks", task.title)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteItem(task.id, "tasks")}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Calendar Events */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-[var(--transition-smooth)] flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  {editingId === event.id && editingType === "calendar_events" ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8"
                      />
                      <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{event.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.event_date && format(new Date(event.event_date), "MMM dd, yyyy")}
                    {event.event_time && ` at ${event.event_time}`}
                  </p>
                </div>
                {editingId !== event.id && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(event.id, "calendar_events", event.title)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteItem(event.id, "calendar_events")}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            Notes & Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-[var(--transition-smooth)] flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  {editingId === note.id && editingType === "notes" ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{note.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(note.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
                {editingId !== note.id && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(note.id, "notes", note.content)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteItem(note.id, "notes")}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Health */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Health & Wellness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health data yet</p>
          ) : (
            health.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-[var(--transition-smooth)] flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  {editingId === item.id && editingType === "health_mentions" ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{item.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(item.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
                {editingId !== item.id && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(item.id, "health_mentions", item.content)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteItem(item.id, "health_mentions")}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
