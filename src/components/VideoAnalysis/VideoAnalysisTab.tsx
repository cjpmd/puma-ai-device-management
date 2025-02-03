import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Upload } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import VideoPlayer from './VideoPlayer';
import DrawingCanvas from './DrawingCanvas';

const VideoAnalysisTab = () => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('game_videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('game_videos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('video_analysis')
        .insert({
          title: file.name,
          video_path: filePath,
          duration: 0, // Will be updated when video loads
        });

      if (dbError) throw dbError;

      setVideoUrl(publicUrl);
      toast({
        title: "Upload successful",
        description: "Video has been uploaded and is ready for analysis",
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>
        </div>

        {videoUrl ? (
          <div className="relative">
            <VideoPlayer videoUrl={videoUrl} />
            <DrawingCanvas width={800} height={450} />
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