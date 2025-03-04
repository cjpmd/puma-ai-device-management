
import { SensorData, TrainingExample } from './activityRecognition';

/**
 * Apply time shifting augmentation to sensor data
 * Shifts the time values by a small random amount
 */
export const timeShiftAugmentation = (
  sensorData: SensorData[],
  maxShiftMs: number = 50
): SensorData[] => {
  const shiftAmount = (Math.random() * 2 - 1) * maxShiftMs; // Random shift between -maxShiftMs and +maxShiftMs
  
  return sensorData.map(reading => ({
    ...reading,
    time: new Date(new Date(reading.time).getTime() + shiftAmount).toISOString(),
    seconds_elapsed: (parseFloat(reading.seconds_elapsed) + shiftAmount / 1000).toString()
  }));
};

/**
 * Apply noise augmentation to sensor data
 * Adds random noise to the sensor readings
 */
export const noiseAugmentation = (
  sensorData: SensorData[],
  noiseFactor: number = 0.05
): SensorData[] => {
  return sensorData.map(reading => {
    // Add noise only to x, y, z values, not to time or other fields
    const addNoise = (value: string) => {
      const numValue = parseFloat(value);
      const noise = (Math.random() * 2 - 1) * noiseFactor * Math.abs(numValue);
      return (numValue + noise).toString();
    };
    
    return {
      ...reading,
      x: addNoise(reading.x),
      y: addNoise(reading.y),
      z: addNoise(reading.z)
    };
  });
};

/**
 * Apply scaling augmentation to sensor data
 * Scales the sensor readings by a small factor
 */
export const scalingAugmentation = (
  sensorData: SensorData[],
  minScale: number = 0.9,
  maxScale: number = 1.1
): SensorData[] => {
  const scaleFactor = minScale + Math.random() * (maxScale - minScale);
  
  return sensorData.map(reading => ({
    ...reading,
    x: (parseFloat(reading.x) * scaleFactor).toString(),
    y: (parseFloat(reading.y) * scaleFactor).toString(),
    z: (parseFloat(reading.z) * scaleFactor).toString()
  }));
};

/**
 * Generate augmented examples from a training example
 */
export const augmentTrainingExample = (
  example: TrainingExample,
  count: number = 3
): TrainingExample[] => {
  const augmentedExamples: TrainingExample[] = [];
  
  for (let i = 0; i < count; i++) {
    // Create raw sensor data format for augmentation
    const rawSensorData: SensorData[] = example.sensorData.map((values, index) => ({
      x: values[0].toString(),
      y: values[1].toString(),
      z: values[2].toString(),
      seconds_elapsed: values[3].toString(),
      sensor: index % 2 === 0 ? 'Accelerometer' : 'Gyroscope', // Alternate between accelerometer and gyroscope
      time: new Date(example.videoTimestamp + index * 20).toISOString() // Create timestamps 20ms apart
    }));
    
    // Apply a random combination of augmentations
    let augmentedData = rawSensorData;
    if (Math.random() > 0.5) augmentedData = timeShiftAugmentation(augmentedData);
    if (Math.random() > 0.5) augmentedData = noiseAugmentation(augmentedData);
    if (Math.random() > 0.5) augmentedData = scalingAugmentation(augmentedData);
    
    // Convert back to the format used in TrainingExample
    const convertedData = convertSensorLoggerData(augmentedData);
    
    augmentedExamples.push({
      sensorData: convertedData,
      label: example.label,
      videoTimestamp: example.videoTimestamp,
      duration: example.duration
    });
  }
  
  return augmentedExamples;
};

// Import the function here to avoid circular dependencies
import { convertSensorLoggerData } from './activityRecognition';

/**
 * Generate augmented examples for a batch of training examples
 */
export const batchAugmentTrainingData = (
  trainingData: TrainingExample[],
  augmentationFactor: number = 2
): TrainingExample[] => {
  const augmentedDataset: TrainingExample[] = [...trainingData];
  
  trainingData.forEach(example => {
    const augmentedExamples = augmentTrainingExample(example, augmentationFactor);
    augmentedDataset.push(...augmentedExamples);
  });
  
  return augmentedDataset;
};
