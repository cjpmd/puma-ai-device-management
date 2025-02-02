import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Toggle } from "@/components/ui/toggle";

interface PlayerMovementMapProps {
  gpsData?: Array<[number, number, number]>; // [timestamp, latitude, longitude]
  possessionData?: Array<[number, boolean]>; // [timestamp, hasPossession]
}

const PlayerMovementMap = ({ gpsData, possessionData }: PlayerMovementMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isIndoorMode, setIsIndoorMode] = useState(true);
  const { toast } = useToast();

  // Draw indoor pitch
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

    // Draw center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, startY);
    ctx.lineTo(canvas.width / 2, startY + pitchHeight);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, pitchHeight * 0.15, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw penalty areas
    const penAreaWidth = pitchWidth * 0.2;
    const penAreaHeight = pitchHeight * 0.4;
    
    // Left penalty area
    ctx.strokeRect(
      startX,
      startY + (pitchHeight - penAreaHeight) / 2,
      penAreaWidth,
      penAreaHeight
    );

    // Right penalty area
    ctx.strokeRect(
      startX + pitchWidth - penAreaWidth,
      startY + (pitchHeight - penAreaHeight) / 2,
      penAreaWidth,
      penAreaHeight
    );

    // Draw player movement if data exists
    if (gpsData?.length) {
      ctx.beginPath();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      
      // Normalize GPS coordinates to pitch dimensions
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
    }
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
          <Toggle
            pressed={isIndoorMode}
            onPressedChange={setIsIndoorMode}
            className="ml-2"
          >
            {isIndoorMode ? 'Indoor Mode' : 'GPS Mode'}
          </Toggle>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isIndoorMode && (
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Enter your Mapbox public token"
              value={mapboxToken}
              onChange={handleTokenChange}
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
      </CardContent>
    </Card>
  );
};

export default PlayerMovementMap;