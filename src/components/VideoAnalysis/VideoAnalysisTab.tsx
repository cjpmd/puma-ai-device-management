import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Upload } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import VideoPlayer from './VideoPlayer';
import DrawingCanvas from './DrawingCanvas';
import ShotMap from '../Analysis/ShotMap';
import PassingHeatmap from '../Analysis/PassingHeatmap';

const VideoAnalysisTab = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string>('');
  const [session, setSession] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload videos",
        variant: "destructive",
      });
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Create a local URL for the video file
      const localVideoUrl = URL.createObjectURL(file);
      setVideoUrl(localVideoUrl);

      // Store video metadata in Supabase
      const { data, error } = await supabase
        .from('video_analysis')
        .insert({
          title: file.name,
          video_path: 'local_storage', // Indicate this is stored locally
          duration: 0, // Will be updated when video loads
        })
        .select()
        .single();

      if (error) throw error;

      setVideoId(data.id);
      
      toast({
        title: "Video loaded successfully",
        description: "Video is stored locally and ready for analysis",
      });
    } catch (error) {
      console.error('Error handling video:', error);
      toast({
        title: "Error",
        description: "There was an error loading your video",
        variant: "destructive",
      });
    }
  };

  const handleTimeUpdate = (currentTime: number) => {
    // This will be used for automatic shot and pass detection
    console.log('Current time:', currentTime);
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <h3 className="text-lg font-semibold mb-4">Authentication Required</h3>
        <p className="text-gray-500">Please log in to access video analysis features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Video Analysis</h3>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="video-upload"
            />
            <Button
              onClick={() => document.getElementById('video-upload')?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>
        </div>

        {videoUrl ? (
          <div className="space-y-6">
            <div className="relative">
              <VideoPlayer videoUrl={videoUrl} onTimeUpdate={handleTimeUpdate} />
              <DrawingCanvas width={800} height={450} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ShotMap videoId={videoId} />
              <PassingHeatmap videoId={videoId} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[450px] border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Upload a video to begin analysis</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VideoAnalysisTab;