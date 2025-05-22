
// Type definitions for Web Bluetooth API
// This declaration file extends Navigator to include the Web Bluetooth API

interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(): Promise<void>;
  unwatchAdvertisements(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(serviceUUID: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(serviceUUID?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  device: BluetoothDevice;
  getCharacteristic(characteristicUUID: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristicUUID?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  service: BluetoothRemoteGATTService;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothAdvertisingEvent extends Event {
  device: BluetoothDevice;
  uuids?: string[];
  name?: string;
  appearance?: number;
  rssi?: number;
  txPower?: number;
  manufacturerData?: Map<number, DataView>;
  serviceData?: Map<string, DataView>;
}

interface BluetoothRequestDeviceFilter {
  services?: (string | number)[];
  name?: string;
  namePrefix?: string;
}

interface BluetoothRequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: (string | number)[];
  acceptAllDevices?: boolean;
}

interface Bluetooth {
  getAvailability(): Promise<boolean>;
  requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  requestLEScan?(options: { filters?: BluetoothRequestDeviceFilter[], keepRepeatedDevices?: boolean, acceptAllAdvertisements?: boolean }): Promise<void>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

// Standard Bluetooth service and characteristic UUIDs
type BluetoothServiceUUID = 
  | 'heart_rate'
  | 'battery_service'
  | 'health_thermometer'
  | 'device_information'
  | string;

type BluetoothCharacteristicUUID = 
  | 'heart_rate_measurement'
  | 'battery_level'
  | 'temperature_measurement'
  | 'manufacturer_name_string'
  | 'serial_number_string'
  | string;

// Extend the Navigator interface to include bluetooth property
interface Navigator {
  bluetooth?: Bluetooth;
}

// Define interfaces for event handling with the Bluetooth API
interface CharacteristicValueChangedEvent extends Event {
  target: BluetoothRemoteGATTCharacteristic;
}
