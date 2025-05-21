
import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothOff, 
  Search, 
  Plus, 
  Trash, 
  Usb, 
  Settings, 
  RefreshCw, 
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDeviceManagement, Device } from './hooks/useDeviceManagement';

const DeviceManagement = () => {
  const {
    devices,
    foundDevices,
    isScanning,
    isBluetoothAvailable,
    biometricData,
    fetchDevices,
    startBluetoothScan,
    scanForUSBDevices,
    addDevice,
    removeDevice,
    connectToDevice,
    disconnectDevice,
    toggleDeviceActive
  } = useDeviceManagement();

  const [newDeviceName, setNewDeviceName] = useState('');
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanType, setScanType] = useState<'bluetooth' | 'usb'>('bluetooth');

  const handleAddDevice = async () => {
    if (newDeviceName.trim()) {
      await addDevice({ device_name: newDeviceName.trim() });
      setNewDeviceName('');
    }
  };

  const startScan = () => {
    if (scanType === 'bluetooth') {
      startBluetoothScan();
    } else {
      scanForUSBDevices();
    }
  };

  const handleDeviceConnect = async (device: Device) => {
    await connectToDevice(device);
    setShowScanDialog(false);
    fetchDevices();
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Settings className="mr-2 h-5 w-5" /> Device Management
        </CardTitle>
        <CardDescription>Add, remove, and manage tracking devices</CardDescription>
        
        {!isBluetoothAvailable && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center">
              <BluetoothOff className="h-4 w-4 mr-2 text-amber-600" />
              Bluetooth is not available in this browser or device. The Web Bluetooth API requires Chrome, Edge, or other Chromium-based browsers.
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="registered">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered">Registered Devices</TabsTrigger>
            <TabsTrigger value="add">Add New Device</TabsTrigger>
          </TabsList>
          
          <TabsContent value="registered" className="space-y-4">
            <div className="flex justify-between items-center my-4">
              <h3 className="text-lg font-medium">Your Devices</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setScanType('bluetooth');
                    setShowScanDialog(true);
                  }}
                  disabled={!isBluetoothAvailable}
                >
                  <Bluetooth className="mr-2 h-4 w-4" />
                  Find Bluetooth Devices
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setScanType('usb');
                    setShowScanDialog(true);
                  }}
                >
                  <Usb className="mr-2 h-4 w-4" />
                  Find USB Devices
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchDevices}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
            
            {devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Connected</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => {
                    const deviceBiometrics = device.bluetooth_id ? biometricData[device.bluetooth_id] : undefined;
                    
                    return (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.device_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {device.device_type === 'heart_rate_monitor' ? 'Heart Rate Monitor' :
                             device.device_type === 'thermometer' ? 'Thermometer' :
                             device.connection_type === 'bluetooth' ? 'Bluetooth Device' :
                             device.connection_type === 'usb' ? 'USB Device' : 
                             'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {device.status === 'connected' ? (
                              <>
                                <BluetoothConnected className="h-4 w-4 text-green-500 mr-2" />
                                <span className="text-green-500">Connected</span>
                              </>
                            ) : device.status === 'disconnected' ? (
                              <>
                                <Bluetooth className="h-4 w-4 text-amber-500 mr-2" />
                                <span className="text-amber-500">Disconnected</span>
                              </>
                            ) : (
                              <>
                                <BluetoothOff className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-gray-400">Inactive</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{device.last_connected ? new Date(device.last_connected).toLocaleString() : 'Never'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {device.status !== 'connected' ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => connectToDevice(device)}
                              >
                                <Bluetooth className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => disconnectDevice(device)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant={device.status === 'connected' ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleDeviceActive(device.id, device.status !== 'connected')}
                            >
                              {device.status === 'connected' ? 'Deactivate' : 'Activate'}
                            </Button>
                            
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => setDeviceToDelete(device)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Show biometric data if connected */}
                          {device.status === 'connected' && deviceBiometrics && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                              {deviceBiometrics.heartRate && (
                                <div className="flex items-center justify-between">
                                  <span>Heart Rate:</span>
                                  <span className="font-medium">{deviceBiometrics.heartRate} bpm</span>
                                </div>
                              )}
                              {deviceBiometrics.temperature && (
                                <div className="flex items-center justify-between">
                                  <span>Temperature:</span>
                                  <span className="font-medium">{deviceBiometrics.temperature.toFixed(1)}°C</span>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <BluetoothOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No devices registered</h3>
                <p className="text-gray-500 mb-4">Start by adding a new device or scanning for Bluetooth devices</p>
                <Button onClick={() => {
                  setScanType('bluetooth');
                  setShowScanDialog(true);
                }} disabled={!isBluetoothAvailable}>
                  <Search className="mr-2 h-4 w-4" />
                  Scan for Devices
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add" className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Add Device Manually</h3>
                <p className="text-sm text-gray-500">Enter device details to add it to your list</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter device name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
                <Button onClick={handleAddDevice}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-2">Search for Devices</h3>
                <p className="text-sm text-gray-500 mb-4">Automatically discover and add devices</p>
                
                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setScanType('bluetooth');
                      setShowScanDialog(true);
                    }}
                    disabled={!isBluetoothAvailable}
                  >
                    <Bluetooth className="mr-2 h-4 w-4" />
                    Scan Bluetooth Devices
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setScanType('usb');
                      setShowScanDialog(true);
                    }}
                  >
                    <Usb className="mr-2 h-4 w-4" />
                    Scan USB Devices
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Device Scanning Dialog */}
        <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {scanType === 'bluetooth' ? 'Scan for Bluetooth Devices' : 'Scan for USB Devices'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6">
              {isScanning ? (
                <div className="text-center">
                  <RefreshCw className="mx-auto h-8 w-8 text-primary animate-spin mb-4" />
                  <p>Scanning for devices...</p>
                </div>
              ) : foundDevices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foundDevices.map((device, index) => (
                      <TableRow key={index}>
                        <TableCell>{device.device_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {device.device_type === 'heart_rate_monitor' ? 'Heart Rate Monitor' : 
                             device.device_type === 'thermometer' ? 'Thermometer' : 
                             'Bluetooth Device'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => handleDeviceConnect(device)}
                          >
                            Connect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center">
                  <p className="mb-4">
                    Click the button below to start scanning for {scanType} devices
                  </p>
                </div>
              )}
              
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={startScan}
                  disabled={isScanning || (scanType === 'bluetooth' && !isBluetoothAvailable)}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Start Scan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={!!deviceToDelete} 
          onOpenChange={(open) => !open && setDeviceToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {deviceToDelete?.device_name} from your devices.
                Any associated data will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (deviceToDelete) {
                    removeDevice(deviceToDelete.id);
                    setDeviceToDelete(null);
                  }
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DeviceManagement;
