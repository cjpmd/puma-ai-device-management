
import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Square, Play, Info, User, Layers, Heart, Thermometer, Droplet, Activity, MapPin, ArrowsUpFromLine, Settings } from 'lucide-react';
import { useAugmentedReality, DetectedPlayer } from './hooks/useAugmentedReality';
import PlayerOverlay from './PlayerOverlay';
import { useDeviceManagement } from '../Devices/hooks/useDeviceManagement';
import { Link } from 'react-router-dom';

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
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  
  const {
    isInitialized,
    isProcessing,
    detectedPlayers,
    error,
    detectPlayers
  } = useAugmentedReality();
  
  const {
    devices,
    biometricData,
    isBluetoothAvailable: isBtAvailable
  } = useDeviceManagement();

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
    
    // Check Bluetooth availability
    const checkBluetoothAvailability = async () => {
      try {
        if (navigator.bluetooth) {
          const available = await navigator.bluetooth.getAvailability();
          setIsBluetoothAvailable(available);
          console.log("Bluetooth available:", available);
        } else {
          console.log("Web Bluetooth API not available");
          setIsBluetoothAvailable(false);
        }
      } catch (err) {
        console.error("Bluetooth check error:", err);
        setIsBluetoothAvailable(false);
      }
    };
    
    checkBluetoothAvailability();
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
        
        // Wait for metadata to load before proceeding
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            
            toast({
              title: "Camera Active",
              description: "AR tracking has started",
            });
            
            // Start the processing loop after video is ready
            startProcessingLoop();
          }
        };
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
        // Make sure video is ready and has dimensions
        if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
          // Clear the canvas and draw the current video frame
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          ctx.drawImage(
            videoRef.current, 
            0, 0, 
            canvasRef.current.width, 
            canvasRef.current.height
          );
          
          // Process the frame to detect players every few frames
          // (to avoid overloading the browser)
          if (Math.random() < 0.1) { // Process ~10% of frames
            try {
              // Process the current canvas directly
              await detectPlayers(canvasRef.current);
            } catch (err) {
              console.error("Error processing frame:", err);
            }
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

  // Get biometrics data from connected devices
  const getConnectedDeviceData = () => {
    // Find all connected devices
    const connectedDevices = devices.filter(d => d.status === 'connected');
    
    // Get their biometric data
    return connectedDevices.flatMap(device => {
      if (device.bluetooth_id && biometricData[device.bluetooth_id]) {
        return {
          deviceName: device.device_name,
          deviceType: device.device_type,
          ...biometricData[device.bluetooth_id]
        };
      }
      return [];
    });
  };
  
  // Calculate team aggregate metrics
  const calculateTeamMetrics = () => {
    const deviceData = getConnectedDeviceData();
    
    // Start with default values
    const metrics = {
      avgHeartRate: 0,
      avgHydration: 75, // %
      avgLacticAcid: 3.5, // mmol/L
      avgVO2Max: 45, // ml/kg/min
      totalSteps: 0,
      totalDistance: 0,
      avgSpeed: 0, // m/s
      highIntensitySprints: Math.floor(Math.random() * 8) + 4, // Random number between 4-12
      totalTouches: Math.floor(Math.random() * 50) + 40, // Random number between 40-90
      totalPasses: Math.floor(Math.random() * 35) + 25, // Random number between 25-60
      totalShots: Math.floor(Math.random() * 8) + 2 // Random number between 2-10
    };
    
    // Aggregate real data where available
    if (deviceData.length > 0) {
      const heartRates = deviceData.filter(d => d.heartRate).map(d => d.heartRate);
      const hydration = deviceData.filter(d => d.hydration).map(d => d.hydration);
      const lacticAcid = deviceData.filter(d => d.lacticAcid).map(d => d.lacticAcid);
      const vo2Max = deviceData.filter(d => d.vo2Max).map(d => d.vo2Max);
      const steps = deviceData.filter(d => d.steps).map(d => d.steps);
      const distances = deviceData.filter(d => d.distance).map(d => d.distance);
      const speeds = deviceData.filter(d => d.speed).map(d => d.speed);
      
      if (heartRates.length > 0) {
        metrics.avgHeartRate = Math.round(heartRates.reduce((a, b) => a + b!, 0) / heartRates.length);
      }
      
      if (hydration.length > 0) {
        metrics.avgHydration = Math.round(hydration.reduce((a, b) => a + b!, 0) / hydration.length);
      }
      
      if (lacticAcid.length > 0) {
        metrics.avgLacticAcid = +(lacticAcid.reduce((a, b) => a + b!, 0) / lacticAcid.length).toFixed(1);
      }
      
      if (vo2Max.length > 0) {
        metrics.avgVO2Max = Math.round(vo2Max.reduce((a, b) => a + b!, 0) / vo2Max.length);
      }
      
      if (steps.length > 0) {
        metrics.totalSteps = steps.reduce((a, b) => a + b!, 0);
      }
      
      if (distances.length > 0) {
        metrics.totalDistance = +(distances.reduce((a, b) => a + b!, 0)).toFixed(2);
      }
      
      if (speeds.length > 0) {
        metrics.avgSpeed = +(speeds.reduce((a, b) => a + b!, 0) / speeds.length).toFixed(1);
      }
    }
    
    return metrics;
  };

  const teamMetrics = calculateTeamMetrics();

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
      
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: AR Camera View */}
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
          
          {/* Right: Biometric Data Display */}
          <div className="flex-1">
            <Card className="h-full bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-red-500" />
                  Team Biometrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Biometric Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                    <div className="flex items-center text-sm text-slate-500 mb-1">
                      <Heart className="h-3 w-3 mr-1 text-red-500" />
                      Heart Rate
                    </div>
                    <div className="text-2xl font-semibold">
                      {teamMetrics.avgHeartRate || '---'} <span className="text-xs text-slate-500">bpm</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                    <div className="flex items-center text-sm text-slate-500 mb-1">
                      <Droplet className="h-3 w-3 mr-1 text-blue-500" />
                      Hydration
                    </div>
                    <div className="text-2xl font-semibold">
                      {teamMetrics.avgHydration || '---'}<span className="text-xs text-slate-500">%</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                    <div className="flex items-center text-sm text-slate-500 mb-1">
                      <Thermometer className="h-3 w-3 mr-1 text-amber-500" />
                      Lactic Acid
                    </div>
                    <div className="text-2xl font-semibold">
                      {teamMetrics.avgLacticAcid || '---'}<span className="text-xs text-slate-500">mmol/L</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white rounded-md shadow-sm border border-gray-100">
                    <div className="flex items-center text-sm text-slate-500 mb-1">
                      <Activity className="h-3 w-3 mr-1 text-indigo-500" />
                      VO2 Max
                    </div>
                    <div className="text-2xl font-semibold">
                      {teamMetrics.avgVO2Max || '---'}<span className="text-xs text-slate-500">ml/kg/min</span>
                    </div>
                  </div>
                </div>
                
                {/* Physical Performance Metrics */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Physical Performance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-sm">Distance</span>
                      </div>
                      <span className="font-medium">{teamMetrics.totalDistance || '0'} km</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <ArrowsUpFromLine className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-sm">Steps</span>
                      </div>
                      <span className="font-medium">{teamMetrics.totalSteps.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-sm">Sprints</span>
                      </div>
                      <span className="font-medium">{teamMetrics.highIntensitySprints}</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-100">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-slate-400" />
                        <span className="text-sm">Avg. Speed</span>
                      </div>
                      <span className="font-medium">{teamMetrics.avgSpeed} m/s</span>
                    </div>
                  </div>
                </div>
                
                {/* Technical Performance Metrics */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Technical Performance</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-md border border-slate-100 text-center">
                      <div className="text-2xl font-semibold">{teamMetrics.totalTouches}</div>
                      <div className="text-xs text-slate-500">Ball Touches</div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-md border border-slate-100 text-center">
                      <div className="text-2xl font-semibold">{teamMetrics.totalPasses}</div>
                      <div className="text-xs text-slate-500">Passes</div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-md border border-slate-100 text-center">
                      <div className="text-2xl font-semibold">{teamMetrics.totalShots}</div>
                      <div className="text-xs text-slate-500">Shots</div>
                    </div>
                  </div>
                </div>

                {/* Link to device management */}
                <div className="pt-2">
                  <Link 
                    to="/devices"
                    className="w-full inline-flex justify-center items-center text-center py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-md text-sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Bluetooth Devices
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
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
