
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Bluetooth } from "lucide-react";
import { useDeviceManagement, Device } from './Devices/hooks/useDeviceManagement';

interface Player {
  id: string;
  name: string;
}

interface DeviceAssignment {
  playerId: string;
  deviceId: number;
}

interface DeviceManagerProps {
  onStartSession: (assignments: DeviceAssignment[]) => void;
}

const DeviceManager = ({ onStartSession }: DeviceManagerProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<DeviceAssignment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { devices, fetchDevices } = useDeviceManagement();

  // Only show active/connected devices
  const activeDevices = devices.filter(device => 
    device.status === 'connected' || !device.status
  );

  useEffect(() => {
    fetchPlayers();
    fetchDevices();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch players",
        variant: "destructive",
      });
    }
  };

  const addAssignment = () => {
    setAssignments([...assignments, { playerId: '', deviceId: 0 }]);
  };

  const updateAssignment = (index: number, field: 'playerId' | 'deviceId', value: string | number) => {
    const newAssignments = [...assignments];
    newAssignments[index] = {
      ...newAssignments[index],
      [field]: value
    };
    setAssignments(newAssignments);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const handleStartSession = () => {
    // Validate assignments
    if (assignments.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one device assignment",
        variant: "destructive",
      });
      return;
    }

    const isValid = assignments.every(a => a.playerId && a.deviceId);
    if (!isValid) {
      toast({
        title: "Error",
        description: "Please complete all assignments",
        variant: "destructive",
      });
      return;
    }

    onStartSession(assignments);
    setIsOpen(false);
    setAssignments([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Start New Session</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Session Setup</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {activeDevices.length === 0 ? (
            <div className="text-center p-4">
              <Bluetooth className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 mb-4">No active devices found</p>
              <Link to="/devices">
                <Button>Manage Devices</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Assign Devices to Players</h3>
                <Link to="/devices" className="text-xs text-primary hover:underline flex items-center">
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Devices
                </Link>
              </div>

              {assignments.map((assignment, index) => (
                <div key={index} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                  <Select
                    value={assignment.playerId.toString()}
                    onValueChange={(value) => updateAssignment(index, 'playerId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={assignment.deviceId.toString()}
                    onValueChange={(value) => updateAssignment(index, 'deviceId', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDevices.map((device) => (
                        <SelectItem key={device.id} value={device.id.toString()}>
                          {device.device_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeAssignment(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}

              <Button onClick={addAssignment}>Add Assignment</Button>
              
              <Button 
                onClick={handleStartSession}
                disabled={assignments.length === 0}
              >
                Start Session
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceManager;
