import { SensorData } from '@/ml/activityRecognition';

export interface GpsData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface MetricAggregation {
  totalSteps: number;
  ballTouches: number;
  successfulPasses: number;
  shotsOnTarget: number;
  confidence: number;
}

export const aggregateMetrics = (sensorData: SensorData[]): MetricAggregation => {
  // This is a simplified implementation - in a real app, you'd use ML to detect these events
  const stepsData = sensorData.filter(d => d.sensor === 'Pedometer');
  const gyroData = sensorData.filter(d => d.sensor.includes('Gyroscope'));
  const accelData = sensorData.filter(d => d.sensor.includes('Accelerometer'));

  return {
    totalSteps: stepsData.length,
    ballTouches: Math.floor(gyroData.length / 100), // Simplified estimation
    successfulPasses: Math.floor(accelData.length / 200), // Simplified estimation
    shotsOnTarget: Math.floor(gyroData.length / 500), // Simplified estimation
    confidence: 0.92
  };
};

export const extractGpsData = (data: any[]): GpsData[] => {
  return data
    .filter(entry => entry.sensor === 'Location')
    .map(entry => ({
      latitude: parseFloat(entry.latitude || '0'),
      longitude: parseFloat(entry.longitude || '0'),
      timestamp: new Date(entry.time).getTime()
    }));
};

export const processRealTimeData = (data: SensorData[]) => {
  const metrics = aggregateMetrics(data);
  const latestData = data.slice(-100); // Get last 100 readings for charts
  
  return {
    metrics,
    timeSeriesData: latestData.map((d, i) => ({
      time: new Date(d.time).toLocaleTimeString(),
      value: Math.sqrt(
        Math.pow(parseFloat(d.x), 2) + 
        Math.pow(parseFloat(d.y), 2) + 
        Math.pow(parseFloat(d.z), 2)
      )
    }))
  };
};