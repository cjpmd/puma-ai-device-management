
import { createContext, useContext, useState } from 'react';
import { ActivityType, TrainingExample } from '@/ml/activityRecognition';

export interface Annotation {
  startTime: number;
  endTime: number;
  activityType: ActivityType;
  sensorData?: number[][];
}

export interface TrainingStats {
  totalExamples: {
    pass: number;
    shot: number;
    dribble: number;
    touch: number;
    no_possession: number;
  };
  currentAccuracy: number;
  epochsCompleted: number;
  lastTrainingTime: string | null;
}

interface MLTrainingContextType {
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  currentLabel: ActivityType;
  setCurrentLabel: (label: ActivityType) => void;
  trainingData: TrainingExample[];
  setTrainingData: (data: TrainingExample[]) => void;
  recordingStartTime: number | null;
  setRecordingStartTime: (time: number | null) => void;
  possessionStartTime: number | null;
  setPossessionStartTime: (time: number | null) => void;
  totalPossessionTime: number;
  setTotalPossessionTime: (time: number) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  localVideoPath: string | null;
  setLocalVideoPath: (path: string | null) => void;
  annotations: Annotation[];
  setAnnotations: (annotations: Annotation[]) => void;
  rawSensorData: any[] | null;
  setRawSensorData: (data: any[] | null) => void;
  trainingStats: TrainingStats;
  setTrainingStats: (stats: TrainingStats) => void;
}

const defaultContext: MLTrainingContextType = {
  isRecording: false,
  setIsRecording: () => {},
  currentLabel: 'pass',
  setCurrentLabel: () => {},
  trainingData: [],
  setTrainingData: () => {},
  recordingStartTime: null,
  setRecordingStartTime: () => {},
  possessionStartTime: null,
  setPossessionStartTime: () => {},
  totalPossessionTime: 0,
  setTotalPossessionTime: () => {},
  currentSessionId: null,
  setCurrentSessionId: () => {},
  localVideoPath: null,
  setLocalVideoPath: () => {},
  annotations: [],
  setAnnotations: () => {},
  rawSensorData: null,
  setRawSensorData: () => {},
  trainingStats: {
    totalExamples: {
      pass: 0,
      shot: 0,
      dribble: 0,
      touch: 0,
      no_possession: 0
    },
    currentAccuracy: 0,
    epochsCompleted: 0,
    lastTrainingTime: null
  },
  setTrainingStats: () => {}
};

export const MLTrainingContext = createContext<MLTrainingContextType>(defaultContext);

export const useMLTraining = () => useContext(MLTrainingContext);

export const MLTrainingProvider = ({ children, onTrainingProgress }: { 
  children: React.ReactNode, 
  onTrainingProgress: (stats: TrainingStats) => void 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<ActivityType>('pass');
  const [trainingData, setTrainingData] = useState<TrainingExample[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [possessionStartTime, setPossessionStartTime] = useState<number | null>(null);
  const [totalPossessionTime, setTotalPossessionTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [localVideoPath, setLocalVideoPath] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [rawSensorData, setRawSensorData] = useState<any[] | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    totalExamples: {
      pass: 0,
      shot: 0,
      dribble: 0,
      touch: 0,
      no_possession: 0
    },
    currentAccuracy: 0,
    epochsCompleted: 0,
    lastTrainingTime: null
  });

  // Update parent component when training stats change
  const handleTrainingStatsUpdate = (newStats: TrainingStats) => {
    setTrainingStats(newStats);
    onTrainingProgress(newStats);
  };

  return (
    <MLTrainingContext.Provider value={{
      isRecording,
      setIsRecording,
      currentLabel,
      setCurrentLabel,
      trainingData,
      setTrainingData,
      recordingStartTime,
      setRecordingStartTime,
      possessionStartTime,
      setPossessionStartTime,
      totalPossessionTime,
      setTotalPossessionTime,
      currentSessionId,
      setCurrentSessionId,
      localVideoPath,
      setLocalVideoPath,
      annotations,
      setAnnotations,
      rawSensorData,
      setRawSensorData,
      trainingStats,
      setTrainingStats: handleTrainingStatsUpdate
    }}>
      {children}
    </MLTrainingContext.Provider>
  );
};
