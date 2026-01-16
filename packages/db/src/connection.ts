import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connect to MongoDB
 */
export async function connectToDatabase(uri: string): Promise<void> {
  if (isConnected) {
    console.log('Already connected to MongoDB');
    return;
  }
  
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Failed to disconnect from MongoDB:', error);
    throw error;
  }
}

/**
 * Get connection status
 */
export function isMongooseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
