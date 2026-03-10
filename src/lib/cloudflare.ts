import { S3Client } from "@aws-sdk/client-s3";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET_NAME = import.meta.env.CLOUDFLARE_R2_BUCKET_NAME;
export const R2_PUBLIC_URL = import.meta.env.R2_PUBLIC_URL;
