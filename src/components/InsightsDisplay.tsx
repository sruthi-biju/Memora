import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Brain, Heart, Sparkles, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Insights {
  mood: string;
  personality: string;
  themes: string[];
  motivation: string;
  suggestions: string[];
}

interface InsightsDisplayProps {
  refreshTrigger: number;
}

export const InsightsDisplay = ({ refreshTrigger }: InsightsDisplayProps) => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [stats, setStats] = useState({
    totalEntries: 0,
    completedTasks: 0,
    totalTasks: 0,
    notesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch stats
      const [entriesRes, tasksRes, notesRes] = await Promise.all([
        supabase.from("journal_entries").select("id").eq("user_id", user.id),
        supabase.from("tasks").select("id, completed").eq("user_id", user.id),
        supabase.from("notes").select("id").eq("user_id", user.id),
      ]);

      const totalTasks = tasksRes.data?.length || 0;
      const completedTasks = tasksRes.data?.filter(t => t.completed).length || 0;

      setStats({
        totalEntries: entriesRes.data?.length || 0,
        completedTasks,
        totalTasks,
        notesCount: notesRes.data?.length || 0,
      });

      // Generate insights
      const { data: insightsData, error } = await supabase.functions.invoke("generate-insights", {
        body: { userId: user.id },
      });

      if (error) {
        console.error("Error generating insights:", error);
      } else if (insightsData) {
        setInsights(insightsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Loading insights...</div>
      </div>
    );
  }

  const getMoodColor = (mood: string) => {
    switch (mood.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'negative': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    }
  };

  const taskProgress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Journal Entries</p>
                <p className="text-2xl font-bold">{stats.totalEntries}</p>
              </div>
              <Activity className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Task Progress</p>
                <p className="text-2xl font-bold">{stats.completedTasks}/{stats.totalTasks}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-80" />
            </div>
            <Progress value={taskProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notes Created</p>
                <p className="text-2xl font-bold">{stats.notesCount}</p>
              </div>
              <Brain className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Mood</p>
                <Badge className={getMoodColor(insights?.mood || 'neutral')}>
                  {insights?.mood || 'Unknown'}
                </Badge>
              </div>
              <Heart className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Dashboard */}
      {insights && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personality Analysis */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Personality Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{insights.personality}</p>
            </CardContent>
          </Card>

          {/* Key Themes */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Key Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {insights.themes.map((theme, index) => (
                  <Badge key={index} variant="secondary">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Motivational Insight */}
          <Card className="shadow-[var(--shadow-card)] md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Motivational Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg italic text-muted-foreground">"{insights.motivation}"</p>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card className="shadow-[var(--shadow-card)] md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Growth Suggestions
              </CardTitle>
              <CardDescription>Personalized recommendations based on your journaling patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <span className="text-muted-foreground">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
