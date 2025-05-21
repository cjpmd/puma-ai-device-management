
import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Square, Play, Info, User, Layers } from 'lucide-react';
import { useAugmentedReality, DetectedPlayer } from './hooks/useAugmentedReality';
import PlayerOverlay from './PlayerOverlay';

interface AugmentedRealityCameraProps {
  width?: number;
  height?: number;
}

const AugmentedRealityCamera: React.FC<AugmentedRealityCameraProps> = ({
  width = 640,
  height = 480
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const requestAnimationRef = useRef<number | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [overlayMode, setOverlayMode] = useState<'basic' | 'detailed' | 'biometrics'>('basic');
  const [permissionRequested, setPermissionRequested] = useState(false);
  
  const {
    isInitialized,
    isProcessing,
    detectedPlayers,
    error,
    detectPlayers
  } = useAugmentedReality();

  // Check for camera availability
  useEffect(() => {
    const checkCameraAvailability = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setIsCameraAvailable(hasCamera);
        
        if (!hasCamera) {
          toast({
            title: "Camera Not Found",
            description: "No camera detected on this device",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error checking camera:", err);
        setIsCameraAvailable(false);
        toast({
          title: "Camera Error",
          description: "Failed to access device cameras",
          variant: "destructive",
        });
      }
    };
    
    checkCameraAvailability();
  }, []);

  // Explicitly request camera permissions when the component mounts
  useEffect(() => {
    if (!permissionRequested) {
      requestCameraPermission();
    }
  }, []);

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissionRequested(true);
      setIsCameraAvailable(true);
      toast({
        title: "Camera Access Granted",
        description: "You can now use the AR player tracking",
      });
    } catch (err) {
      console.error("Permission request failed:", err);
      setPermissionRequested(true);
      toast({
        title: "Camera Permission Denied",
        description: "Please enable camera access in your browser settings",
        variant: "destructive",
      });
    }
  };

  // Handle camera activation/deactivation
  useEffect(() => {
    if (isActive && isCameraAvailable) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isActive, isCameraAvailable]);

  // Start camera stream
  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "environment" // Use back camera if available
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
        
        toast({
          title: "Camera Active",
          description: "AR tracking has started",
        });
        
        // Start the processing loop
        startProcessingLoop();
      }
    } catch (err) {
      console.error("Error starting camera:", err);
      setIsActive(false);
      toast({
        title: "Camera Error",
        description: "Failed to start video stream",
        variant: "destructive",
      });
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (requestAnimationRef.current) {
      cancelAnimationFrame(requestAnimationRef.current);
      requestAnimationRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Process video frames for player detection
  const startProcessingLoop = () => {
    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !isInitialized || isProcessing) {
        requestAnimationRef.current = requestAnimationFrame(processFrame);
        return;
      }
      
      const ctx = canvasRef.current.getContext('2d');
      
      if (ctx) {
        // Draw the current video frame to the canvas
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        
        // Process the frame to detect players every few frames
        // (to avoid overloading the browser)
        if (Math.random() < 0.1) { // Process ~10% of frames
          try {
            // Create a bitmap from the canvas for detection
            const bitmap = await createImageBitmap(canvasRef.current);
            detectPlayers(bitmap);
          } catch (err) {
            console.error("Error processing frame:", err);
          }
        }
      }
      
      // Continue the processing loop
      requestAnimationRef.current = requestAnimationFrame(processFrame);
    };
    
    // Start the processing loop
    processFrame();
  };

  // Toggle the camera on/off
  const toggleCamera = () => {
    setIsActive(prev => !prev);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">
          AR Player Tracking
        </CardTitle>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={overlayMode} onValueChange={(value) => value && setOverlayMode(value as any)}>
            <ToggleGroupItem value="basic" aria-label="Basic overlay">
              <Square className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="detailed" aria-label="Detailed overlay">
              <User className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="biometrics" aria-label="Biometrics overlay">
              <Layers className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Button 
            variant={isActive ? "destructive" : "default"} 
            onClick={toggleCamera}
            disabled={!isCameraAvailable || !isInitialized}
          >
            {isActive ? (
              <>
                <Square className="mr-2 h-4 w-4" /> Stop
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Start
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="relative rounded-lg overflow-hidden" style={{ width, height }}>
          {/* Video element (hidden, used as source for canvas) */}
          <video 
            ref={videoRef}
            width={width}
            height={height}
            autoPlay
            playsInline
            muted
            className="hidden"
          />
          
          {/* Canvas for drawing video frames and overlays */}
          <canvas 
            ref={canvasRef}
            width={width}
            height={height}
            className="bg-gray-900"
          />
          
          {/* Player detection overlays */}
          {isActive && detectedPlayers.map((player) => (
            <PlayerOverlay
              key={player.id}
              player={player}
              canvasWidth={width}
              canvasHeight={height}
              mode={overlayMode}
            />
          ))}
          
          {/* Status overlays */}
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
              <Camera className="h-12 w-12 mb-2" />
              <p className="text-lg font-medium">
                {!isCameraAvailable 
                  ? "Camera not available" 
                  : !isInitialized 
                    ? "Initializing AR system..." 
                    : "Press Start to begin AR tracking"}
              </p>
              {!permissionRequested && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={requestCameraPermission}
                  className="mt-3"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Allow Camera Access
                </Button>
              )}
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </div>
          )}
          
          {/* Information overlay while active */}
          {isActive && (
            <div className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded text-sm">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-1" />
                <span>Tracking {detectedPlayers.length} players</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Player stats summary */}
        {isActive && detectedPlayers.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {detectedPlayers.slice(0, 4).map(player => (
              <div 
                key={player.id}
                className="bg-slate-100 p-3 rounded-lg"
              >
                <div className="font-medium flex items-center">
                  <span className="bg-gray-800 text-white w-6 h-6 flex items-center justify-center rounded-full mr-2">
                    {player.shirtNumber || '?'}
                  </span>
                  {player.name || `Player ${player.id + 1}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {player.position || 'Unknown'} · {player.biometrics?.heartRate || '---'} bpm
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AugmentedRealityCamera;
