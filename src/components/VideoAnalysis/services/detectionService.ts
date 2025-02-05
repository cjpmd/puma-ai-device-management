
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const storeDetection = async (
  videoId: string,
  currentTime: number,
  prediction: {
    class: string;
    score: number;
    bbox: [number, number, number, number];
  },
  dimensions: { width: number; height: number }
) => {
  const [x, y, boxWidth, boxHeight] = prediction.bbox;

  const { error } = await supabase
    .from('object_detections')
    .insert({
      video_id: videoId,
      frame_time: currentTime,
      object_class: prediction.class,
      confidence: prediction.score,
      x_coord: x / dimensions.width,
      y_coord: y / dimensions.height,
      width: boxWidth / dimensions.width,
      height: boxHeight / dimensions.height
    });

  if (error) throw error;
};
