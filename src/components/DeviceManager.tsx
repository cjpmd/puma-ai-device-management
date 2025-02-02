import { useState, useEffect } from 'react';
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Player {
  id: string;
  name: string;
}

interface Device {
  id: number;
  device_name: string;
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [assignments, setAssignments] = useState<DeviceAssignment[]>([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

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

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, device_name')
        .order('device_name');
      
      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch devices",
        variant: "destructive",
      });
    }
  };

  const addDevice = async () => {
    if (!newDeviceName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a device name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('devices')
        .insert({ device_name: newDeviceName.trim() })
        .select()
        .single();

      if (error) throw error;

      setDevices([...devices, data]);
      setNewDeviceName('');
      toast({
        title: "Success",
        description: "Device added successfully",
      });
    } catch (error) {
      console.error('Error adding device:', error);
      toast({
        title: "Error",
        description: "Failed to add device",
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
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter device name"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
            />
            <Button onClick={addDevice}>Add Device</Button>
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
                  {devices.map((device) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceManager;