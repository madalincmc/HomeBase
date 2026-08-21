import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions cap request bodies at 1MB by default — well under
      // the 10MB attachment limit every upload/extraction action already
      // validates for (attachments/actions.ts, extract-bill.ts,
      // extract-reading.ts). Without raising this, a real phone photo
      // (routinely 2-8MB) never reaches that validation at all: the
      // framework rejects the request first, and the client just sees a
      // generic "Failed to fetch". Padded slightly past 10MB for
      // multipart/form-data's own boundary/header overhead.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
