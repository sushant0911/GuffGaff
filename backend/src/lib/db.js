import mongoose from "mongoose";

// Simple cached connection helper for long-running servers and serverless environments
export const connectDB = async ({ retries = 3, delay = 2000 } = {}) => {
  // If already connected, reuse the existing connection
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB: already connected");
    return mongoose.connection;
  }

  // Read and sanitize the MongoDB URI from environment variables
  let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri) {
    mongoUri = mongoUri.trim();
    // Strip accidental wrapping quotes
    if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
      mongoUri = mongoUri.slice(1, -1);
    }
  }

  if (!mongoUri) {
    const msg = "MONGODB_URI is not defined. Set the environment variable and try again.";
    console.error(msg);
    throw new Error(msg);
  }

  try {
    // Keep timeouts reasonably short so failures surface quickly
    const opts = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    };

    const conn = await mongoose.connect(mongoUri, opts);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    // Provide a clearer message for DNS SRV lookup failures which are common with +srv URIs
    if (error && (error.code === 'ENOTFOUND' || (error.message && error.message.includes('querySrv ENOTFOUND')))) {
      console.error('MongoDB SRV DNS lookup failed (querySrv ENOTFOUND).');
      console.error('Possible causes:');
      console.error('- The host in your MONGODB_URI is incorrect.');
      console.error("- Network/DNS is blocking SRV lookups from this environment (corporate network / firewall). ");
      console.error('- The environment variable may contain accidental quotes/newlines.');
      console.error('\nQuick checks:');
      console.error(`- Ensure MONGODB_URI is set and looks like: mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/<dbname>?retryWrites=true&w=majority`);
      console.error(`- Run a SRV lookup from the deployment environment or your machine:\n  nslookup -type=SRV _mongodb._tcp.${getHostFromUri(mongoUri)}`);
      console.error('\nWorkarounds:');
      console.error('- Use the non-SRV (standard) connection string from Atlas (contains explicit host:port list) and set that as MONGODB_URI.');
      // If the deploy environment provides a non-SRV URI, try that as a fallback once
      const nonSrv = process.env.MONGODB_URI_NON_SRV || process.env.MONGO_URI_NON_SRV;
      if (nonSrv) {
        console.warn('Attempting fallback to non-SRV MongoDB URI from MONGODB_URI_NON_SRV environment variable.');
        try {
          const sanitized = nonSrv.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
          const opts2 = { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 };
          const conn2 = await mongoose.connect(sanitized, opts2);
          console.log(`MongoDB connected (non-SRV fallback): ${conn2.connection.host}`);
          return conn2.connection;
        } catch (e2) {
          console.error('Non-SRV fallback connection failed:', e2.message || e2);
        }
      }
    }

    if (retries > 0) {
      console.warn(`MongoDB connection failed. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((res) => setTimeout(res, delay));
      return connectDB({ retries: retries - 1, delay: delay * 2 });
    }

    console.error('MongoDB connection error:', error);
    throw error;
  }
};

function getHostFromUri(uri) {
  try {
    // Extract host portion after @ and before /
    const at = uri.indexOf('@');
    if (at === -1) return uri;
    const afterAt = uri.slice(at + 1);
    const slash = afterAt.indexOf('/');
    return slash === -1 ? afterAt : afterAt.slice(0, slash);
  } catch (e) {
    return uri;
  }
}
