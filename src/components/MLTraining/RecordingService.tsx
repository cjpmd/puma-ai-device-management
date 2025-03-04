
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMLTraining } from "./MLTrainingContext";

export const useRecordingService = () => {
  const { 
    setCurrentSessionId, 
    setRecordingStartTime, 
    setPossessionStartTime, 
    currentSessionId,
    possessionStartTime,
    setLocalVideoPath,
    isRecording,
    setIsRecording
  } = useMLTraining();
  const { toast } = useToast();

  const toggleRecording = async () => {
    if (!isRecording) {
      const startTime = Date.now();
      
      // Create new training session in Supabase
      const { data: session, error } = await supabase
        .from('ml_training_sessions')
        .insert({
          activity_type: 'pass', // default starting type
          video_timestamp: startTime,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating training session:', error);
        toast({
          title: "Error",
          description: "Failed to start training session",
          variant: "destructive",
        });
        return;
      }

      setCurrentSessionId(session.id);
      setRecordingStartTime(startTime);
      setPossessionStartTime(startTime);
      setIsRecording(true);
      
      toast({
        title: "Recording session started",
        description: "Upload your pre-recorded video and sensor data files for this session.",
      });
    } else {
      // Update session end time in Supabase
      if (currentSessionId) {
        const { error } = await supabase
          .from('ml_training_sessions')
          .update({ 
            end_time: new Date().toISOString(),
            duration: possessionStartTime ? Date.now() - possessionStartTime : null
          })
          .eq('id', currentSessionId);

        if (error) {
          console.error('Error updating training session:', error);
        }
      }

      setRecordingStartTime(null);
      setCurrentSessionId(null);
      setPossessionStartTime(null);
      setIsRecording(false);
      
      // Clear the local video URL
      if (setLocalVideoPath) {
        setLocalVideoPath(null);
      }
      
      toast({
        title: "Recording session stopped",
        description: "Training data has been processed.",
      });
    }
  };

  return { toggleRecording };
};
