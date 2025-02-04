import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Toggle } from "@/components/ui/toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity, Target, ArrowRight, Ball, Hand } from 'lucide-react';

interface PlayerMovementMapProps {
  gpsData?: Array<[number, number, number]>; // [timestamp, latitude, longitude]
  possessionData?: Array<[number, boolean]>; // [timestamp, hasPossession]
  shotsData?: Array<{x: number, y: number, isGoal: boolean}>;
  passesData?: Array<{startX: number, startY: number, endX: number, endY: number, isSuccessful: boolean}>;
  dribblingData?: Array<{x: number, y: number, distance: number}>;
  touchesData?: Array<{x: number, y: number, type: string}>;
}

const PlayerMovementMap = ({ 
  gpsData, 
  possessionData,
  shotsData = [],
  passesData = [],
  dribblingData = [],
  touchesData = []
}: PlayerMovementMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isIndoorMode, setIsIndoorMode] = useState(true);
  const [analysisType, setAnalysisType] = useState<'movement' | 'heatmap' | 'shots' | 'passes' | 'dribbling' | 'touches'>('movement');
  const [showThirds, setShowThirds] = useState(false);
  const { toast } = useToast();

  // Draw indoor pitch with thirds
  const drawIndoorPitch = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set pitch dimensions
    const pitchWidth = canvas.width * 0.9;
    const pitchHeight = canvas.height * 0.9;
    const startX = (canvas.width - pitchWidth) / 2;
    const startY = (canvas.height - pitchHeight) / 2;

    // Draw pitch outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, pitchWidth, pitchHeight);

    // Draw thirds if enabled
    if (showThirds) {
      const thirdWidth = pitchWidth / 3;
      ctx.beginPath();
      ctx.moveTo(startX + thirdWidth, startY);
      ctx.lineTo(startX + thirdWidth, startY + pitchHeight);
      ctx.moveTo(startX + thirdWidth * 2, startY);
      ctx.lineTo(startX + thirdWidth * 2, startY + pitchHeight);
      ctx.stroke();
    }

    // Draw center line and circle
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, startY);
    ctx.lineTo(canvas.width / 2, startY + pitchHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, pitchHeight * 0.15, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw penalty areas
    const penAreaWidth = pitchWidth * 0.2;
    const penAreaHeight = pitchHeight * 0.4;
    
    ctx.strokeRect(
      startX,
      startY + (pitchHeight - penAreaHeight) / 2,
      penAreaWidth,
      penAreaHeight
    );

    ctx.strokeRect(
      startX + pitchWidth - penAreaWidth,
      startY + (pitchHeight - penAreaHeight) / 2,
      penAreaWidth,
      penAreaHeight
    );

    // Draw analysis data based on type
    switch (analysisType) {
      case 'movement':
        drawMovementLines(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
      case 'heatmap':
        drawHeatmap(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
      case 'shots':
        drawShots(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
      case 'passes':
        drawPasses(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
      case 'dribbling':
        drawDribbling(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
      case 'touches':
        drawTouches(ctx, startX, startY, pitchWidth, pitchHeight);
        break;
    }
  };

  const drawMovementLines = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    if (!gpsData?.length) return;

    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    
    const normalizedPoints = gpsData.map(([_, lat, lng]) => ({
      x: startX + (lng - Math.min(...gpsData.map(d => d[2]))) / (Math.max(...gpsData.map(d => d[2])) - Math.min(...gpsData.map(d => d[2]))) * pitchWidth,
      y: startY + (lat - Math.min(...gpsData.map(d => d[1]))) / (Math.max(...gpsData.map(d => d[1])) - Math.min(...gpsData.map(d => d[1]))) * pitchHeight
    }));

    normalizedPoints.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  };

  const drawHeatmap = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    if (!gpsData?.length) return;

    const resolution = 20;
    const cellWidth = pitchWidth / resolution;
    const cellHeight = pitchHeight / resolution;
    const heatmapData = Array(resolution).fill(0).map(() => Array(resolution).fill(0));

    // Aggregate position data
    gpsData.forEach(([_, lat, lng]) => {
      const x = Math.floor((lng - Math.min(...gpsData.map(d => d[2]))) / (Math.max(...gpsData.map(d => d[2])) - Math.min(...gpsData.map(d => d[2]))) * resolution);
      const y = Math.floor((lat - Math.min(...gpsData.map(d => d[1]))) / (Math.max(...gpsData.map(d => d[1])) - Math.min(...gpsData.map(d => d[1]))) * resolution);
      if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
        heatmapData[y][x]++;
      }
    });

    // Draw heatmap
    const maxValue = Math.max(...heatmapData.flat());
    heatmapData.forEach((row, y) => {
      row.forEach((value, x) => {
        const intensity = value / maxValue;
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.7})`;
        ctx.fillRect(
          startX + x * cellWidth,
          startY + y * cellHeight,
          cellWidth,
          cellHeight
        );
      });
    });
  };

  const drawShots = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    shotsData.forEach(shot => {
      ctx.fillStyle = shot.isGoal ? 'green' : 'red';
      ctx.beginPath();
      ctx.arc(
        startX + (shot.x / 100) * pitchWidth,
        startY + (shot.y / 100) * pitchHeight,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };

  const drawPasses = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    passesData.forEach(pass => {
      ctx.strokeStyle = pass.isSuccessful ? 'blue' : 'orange';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX + (pass.startX / 100) * pitchWidth, startY + (pass.startY / 100) * pitchHeight);
      ctx.lineTo(startX + (pass.endX / 100) * pitchWidth, startY + (pass.endY / 100) * pitchHeight);
      ctx.stroke();
    });
  };

  const drawDribbling = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    dribblingData.forEach(dribble => {
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      ctx.arc(
        startX + (dribble.x / 100) * pitchWidth,
        startY + (dribble.y / 100) * pitchHeight,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };

  const drawTouches = (ctx: CanvasRenderingContext2D, startX: number, startY: number, pitchWidth: number, pitchHeight: number) => {
    touchesData.forEach(touch => {
      ctx.fillStyle = 'purple';
      ctx.beginPath();
      ctx.arc(
        startX + (touch.x / 100) * pitchWidth,
        startY + (touch.y / 100) * pitchHeight,
        5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };

  useEffect(() => {
    if (isIndoorMode) {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        drawIndoorPitch();
      }
      return;
    }

    if (!mapContainer.current || !mapboxToken || !gpsData?.length) {
      if (!mapboxToken && !isIndoorMode) {
        toast({
          title: "Mapbox Token Required",
          description: "Please enter your Mapbox public token to view the GPS map.",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      
      if (!map.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: [gpsData[0][2], gpsData[0][1]],
          zoom: 18,
          pitch: 45,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          if (!map.current) return;

          // Add path layer
          map.current.addSource('movement-path', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: gpsData.map(([_, lat, lng]) => [lng, lat])
              }
            }
          });

          map.current.addLayer({
            id: 'movement-path',
            type: 'line',
            source: 'movement-path',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#22c55e',
              'line-width': 3
            }
          });

          // Add heatmap layer
          map.current.addSource('movement-heat', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: gpsData.map(([_, lat, lng]) => ({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat]
                }
              }))
            }
          });

          map.current.addLayer({
            id: 'movement-heat',
            type: 'heatmap',
            source: 'movement-heat',
            paint: {
              'heatmap-weight': 1,
              'heatmap-intensity': 1,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgb(103,169,207)',
                0.4, 'rgb(209,229,240)',
                0.6, 'rgb(253,219,199)',
                0.8, 'rgb(239,138,98)',
                1, 'rgb(178,24,43)'
              ],
              'heatmap-radius': 15
            }
          });
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Please check your Mapbox token.",
        variant: "destructive",
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [gpsData, mapboxToken, isIndoorMode]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setMapboxToken(newToken);
    if (newToken && !isIndoorMode) {
      toast({
        title: "Token Updated",
        description: "Mapbox token has been updated.",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Player Movement Map</span>
          <div className="flex items-center gap-2">
            <Toggle
              pressed={showThirds}
              onPressedChange={setShowThirds}
              className="ml-2"
            >
              Show Thirds
            </Toggle>
            <Toggle
              pressed={isIndoorMode}
              onPressedChange={setIsIndoorMode}
              className="ml-2"
            >
              {isIndoorMode ? 'Indoor Mode' : 'GPS Mode'}
            </Toggle>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select analysis type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="movement">Player Movement</SelectItem>
            <SelectItem value="heatmap">Heat Map</SelectItem>
            <SelectItem value="shots">Shots Map</SelectItem>
            <SelectItem value="passes">Passes</SelectItem>
            <SelectItem value="dribbling">Dribbling</SelectItem>
            <SelectItem value="touches">Touches</SelectItem>
          </SelectContent>
        </Select>

        {!isIndoorMode && (
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Enter your Mapbox public token"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
          </div>
        )}
        
        {isIndoorMode ? (
          <canvas 
            ref={canvasRef}
            className="h-[500px] w-full rounded-lg bg-[#0F172A]"
          />
        ) : (
          <div ref={mapContainer} className="h-[500px] rounded-lg overflow-hidden" />
        )}

        {showThirds && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Defensive Third</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add statistics for defensive third */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Middle Third</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add statistics for middle third */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Attacking Third</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add statistics for attacking third */}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerMovementMap;
