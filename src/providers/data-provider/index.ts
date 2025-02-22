import { DataProvider } from "@refinedev/core";
import { shrinkedDataProvider } from "./shrinked-data-provider";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

// R2 configuration
const R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
	accessKeyId: R2_ACCESS_KEY_ID ?? '',
	secretAccessKey: R2_SECRET_ACCESS_KEY ?? ''
  }
});

// Main provider for Shrinked API endpoints
const mainProvider = shrinkedDataProvider(API_URL);

// R2 provider remains the same as before
const r2Provider: DataProvider = {
  // ... your existing r2Provider implementation
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};