MongoDB connection troubleshooting

Problem:

- `querySrv ENOTFOUND` errors occur when the environment blocks DNS SRV lookups (common in corporate networks or restricted hosting).

Quick solutions:

1. Preferred: use the Standard (non-SRV) connection string from MongoDB Atlas

   - In Atlas UI: Connect -> Drivers -> Choose "Standard connection string (includes replica set and port list)".
   - Set the resulting URL to `MONGODB_URI_NON_SRV` (or overwrite `MONGODB_URI`).

2. Test SRV resolution locally:

   - Run: `nslookup -type=SRV _mongodb._tcp.<your-cluster-host>`

3. Example env variables (see `.env.example`):

   - `MONGODB_URI_NON_SRV="mongodb://host1:27017,host2:27017/<dbname>?replicaSet=...&ssl=true&authSource=admin"`

4. If using a hosting provider, set the variable in their dashboard exactly (no extra quotes or newlines).

Notes about this project:

- The startup now checks for either `MONGODB_URI` or `MONGODB_URI_NON_SRV` and exits early if neither is set.
- `backend/src/lib/db.js` will trim accidental quotes and attempt a single fallback connection using `MONGODB_URI_NON_SRV` if SRV DNS fails.
