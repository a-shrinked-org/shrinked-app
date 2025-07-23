import { JobMetadata } from '@/types/job';

// In-memory store for job metadata (replace with Redis/database in production)
export const jobStore: Map<string, JobMetadata> = new Map();