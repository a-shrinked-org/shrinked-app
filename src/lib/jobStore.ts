import { JobMetadata } from '@/types/job';
import * as fs from 'fs';
import * as path from 'path';

const STORE_FILE = path.join(process.cwd(), 'jobStore.json');

// In-memory store for job metadata
const _jobStore: Map<string, JobMetadata> = new Map();

// Function to load the store from file
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf8');
      const parsedData = JSON.parse(data);
      for (const key in parsedData) {
        _jobStore.set(key, parsedData[key]);
      }
      console.log('Job store loaded from file.');
    }
  } catch (error) {
    console.error('Error loading job store from file:', error);
  }
}

// Function to save the store to file
function saveStore() {
  try {
    const data = JSON.stringify(Object.fromEntries(_jobStore));
    fs.writeFileSync(STORE_FILE, data, 'utf8');
    console.log('Job store saved to file.');
  } catch (error) {
    console.error('Error saving job store to file:', error);
  }
}

// Initialize store on module load
loadStore();

export const jobStore = {
  get: (jobId: string): JobMetadata | undefined => {
    return _jobStore.get(jobId);
  },
  set: (jobId: string, metadata: JobMetadata) => {
    _jobStore.set(jobId, metadata);
    saveStore(); // Save after every set operation
  },
  delete: (jobId: string) => {
    _jobStore.delete(jobId);
    saveStore(); // Save after every delete operation
  },
  has: (jobId: string): boolean => {
    return _jobStore.has(jobId);
  },
  clear: () => {
    _jobStore.clear();
    saveStore(); // Save after clearing
  },
  size: (): number => {
    return _jobStore.size;
  },
};
