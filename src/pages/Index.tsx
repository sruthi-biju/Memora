import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { JournalInput } from "@/components/JournalInput";
import { InsightsDisplay } from "@/components/InsightsDisplay";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  const handleProcessed = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>;
  }
  if (!user) {
    return <Auth />;
  }
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <SidebarTrigger />
              <div className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h1 className="bg-[var(--gradient-hero)] bg-clip-text text-[#45b0a5] my-0 py-0 font-semibold text-xl">memora</h1>
              </div>
              <Button variant="outline" onClick={handleSignOut} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8 space-y-8 flex-1">
            <div className="text-center mb-8">
              <h2 className="text-muted-foreground font-medium text-left text-2xl">
                Welcome {user?.user_metadata?.email?.split('@')[0] || 'back'}
              </h2>
            </div>
            <JournalInput onProcessed={handleProcessed} />
            <InsightsDisplay refreshTrigger={refreshTrigger} />
          </main>
        </div>
      </div>
    </SidebarProvider>;
};
export default Index;