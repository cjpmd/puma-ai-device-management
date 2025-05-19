
import { Link } from 'react-router-dom';
import DeviceManagement from '@/components/Devices/DeviceManagement';
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';

const Devices = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">Device Management</h1>
          <div className="flex gap-4">
            <Link to="/analysis" className="text-primary hover:underline">
              Back to Analysis
            </Link>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Device Settings
            </Button>
          </div>
        </div>
        
        <DeviceManagement />
      </div>
    </div>
  );
};

export default Devices;
