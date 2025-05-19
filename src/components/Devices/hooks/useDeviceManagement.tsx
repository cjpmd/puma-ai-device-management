
import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Device {
  id: number;
  device_name: string;
  device_id?: string;
  status?: 'connected' | 'disconnected' | 'inactive';
  connection_type?: 'bluetooth' | 'usb';
  last_connected?: string;
}

export const useDeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState<Device[]>([]);
  const { toast } = useToast();

  // Fetch registered devices from the database
  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
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

  // Scan for Bluetooth devices
  const startBluetoothScan = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    
    try {
      // Simulated Bluetooth scanning functionality
      // In a real implementation, this would use the Web Bluetooth API or Capacitor plugins
      setTimeout(() => {
        const mockFoundDevices = [
          { id: 0, device_name: "SensorTag 1", device_id: "AA:BB:CC:DD:EE:01", connection_type: "bluetooth" },
          { id: 0, device_name: "SensorTag 2", device_id: "AA:BB:CC:DD:EE:02", connection_type: "bluetooth" },
          { id: 0, device_name: "Motion Sensor", device_id: "AA:BB:CC:DD:EE:03", connection_type: "bluetooth" }
        ] as Device[];
        
        setFoundDevices(mockFoundDevices);
        setIsScanning(false);
        
        toast({
          title: "Scan complete",
          description: `Found ${mockFoundDevices.length} device(s)`,
        });
      }, 2000);
    } catch (error) {
      console.error('Error scanning for devices:', error);
      toast({
        title: "Error",
        description: "Failed to scan for Bluetooth devices",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  // Scan for USB connected devices
  const scanForUSBDevices = async () => {
    setIsScanning(true);
    setFoundDevices([]);
    
    try {
      // Simulated USB scanning functionality
      // In a real implementation, this would use Capacitor plugins for USB connections
      setTimeout(() => {
        const mockFoundDevices = [
          { id: 0, device_name: "USB Sensor 1", device_id: "USB001", connection_type: "usb" },
          { id: 0, device_name: "USB Sensor 2", device_id: "USB002", connection_type: "usb" }
        ] as Device[];
        
        setFoundDevices(mockFoundDevices);
        setIsScanning(false);
        
        toast({
          title: "USB scan complete",
          description: `Found ${mockFoundDevices.length} USB device(s)`,
        });
      }, 1500);
    } catch (error) {
      console.error('Error scanning for USB devices:', error);
      toast({
        title: "Error",
        description: "Failed to scan for USB devices",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  // Add a new device to the database
  const addDevice = async (device: Omit<Device, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .insert({ device_name: device.device_name })
        .select()
        .single();

      if (error) throw error;

      setDevices([...devices, data]);
      toast({
        title: "Success",
        description: "Device added successfully",
      });
      return data;
    } catch (error) {
      console.error('Error adding device:', error);
      toast({
        title: "Error",
        description: "Failed to add device",
        variant: "destructive",
      });
      return null;
    }
  };

  // Remove a device from the database
  const removeDevice = async (deviceId: number) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      setDevices(devices.filter(d => d.id !== deviceId));
      toast({
        title: "Success",
        description: "Device removed successfully",
      });
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive",
      });
    }
  };

  // Connect to a specific device
  const connectToDevice = async (device: Device) => {
    try {
      // Here would be actual device connection code using Bluetooth or USB APIs
      // For now, this is simulated
      toast({
        title: "Connecting",
        description: `Connecting to ${device.device_name}...`,
      });
      
      setTimeout(() => {
        toast({
          title: "Connected",
          description: `Successfully connected to ${device.device_name}`,
        });
        
        // Update device status in local state
        setDevices(prev => prev.map(d => 
          d.id === device.id ? { ...d, status: 'connected' } : d
        ));
      }, 1000);
    } catch (error) {
      console.error('Error connecting to device:', error);
      toast({
        title: "Connection failed",
        description: `Could not connect to ${device.device_name}`,
        variant: "destructive",
      });
    }
  };

  // Activate/Deactivate a device
  const toggleDeviceActive = async (deviceId: number, isActive: boolean) => {
    try {
      // In a real implementation, you would update the device status in the database
      // For now, we just update the UI
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, status: isActive ? 'connected' : 'inactive' } 
          : device
      ));
      
      toast({
        title: isActive ? "Device Activated" : "Device Deactivated",
        description: `Device ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling device active state:', error);
      toast({
        title: "Error",
        description: "Failed to update device status",
        variant: "destructive",
      });
    }
  };

  // Load devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  return {
    devices,
    foundDevices,
    isScanning,
    fetchDevices,
    startBluetoothScan,
    scanForUSBDevices,
    addDevice,
    removeDevice,
    connectToDevice,
    toggleDeviceActive
  };
};
