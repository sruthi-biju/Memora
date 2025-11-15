import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Mic, Square } from "lucide-react";

interface JournalInputProps {
  onProcessed: () => void;
}

export const JournalInput = ({ onProcessed }: JournalInputProps) => {
  const [content, setContent] = useState("");
  const [processing, setProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        const { data, error } = await supabase.functions.invoke("transcribe-audio", {
          body: { audio: base64Audio },
        });

        if (error) throw error;

        if (data?.text) {
          setContent(prev => prev ? `${prev}\n\n${data.text}` : data.text);
          toast.success("Transcription complete!");
        }
      };
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      toast.error(error.message || "Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please write something in your journal");
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to continue");
        return;
      }

      const { data, error } = await supabase.functions.invoke("process-journal", {
        body: {
          journalContent: content,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast.success("Journal processed! Your insights are ready.");
      setContent("");
      onProcessed();
    } catch (error: any) {
      console.error("Error processing journal:", error);
      toast.error(error.message || "Failed to process journal entry");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Today's Journal
        </CardTitle>
        <CardDescription>
          Tell me about your day and I'll organize everything for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Today I woke up early and went for a run. Need to finish the project report by Friday. Feeling energized! Meeting with Sarah at 2pm tomorrow..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] resize-none transition-[var(--transition-smooth)]"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || processing}
              className="flex-shrink-0"
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  {isTranscribing ? "Transcribing..." : "Record"}
                </>
              )}
            </Button>
            <Button
              type="submit"
              disabled={processing || isRecording || isTranscribing}
              className="flex-1"
            >
              {processing ? "Processing..." : "Process Journal Entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
