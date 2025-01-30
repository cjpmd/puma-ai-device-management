import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface PlayerMovementMapProps {
  gpsData?: Array<[number, number, number]>; // [timestamp, latitude, longitude]
  possessionData?: Array<[number, boolean]>; // [timestamp, hasPossession]
}

const PlayerMovementMap = ({ gpsData, possessionData }: PlayerMovementMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !gpsData?.length) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Initialize map centered on the first GPS coordinate
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-v9',
        center: [gpsData[0][2], gpsData[0][1]],
        zoom: 18,
        pitch: 45,
      });

      // Add navigation controls
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

        // Different colors for possession vs no possession
        map.current.addLayer({
          id: 'movement-path',
          type: 'line',
          source: 'movement-path',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'hasPossession'],
              true, '#22c55e', // green for possession
              '#ef4444'  // red for no possession
            ],
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
    };
  }, [gpsData, mapboxToken]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Player Movement Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Enter your Mapbox public token"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
          />
        </div>
        <div ref={mapContainer} className="h-[500px] rounded-lg overflow-hidden" />
      </CardContent>
    </Card>
  );
};

export default PlayerMovementMap;