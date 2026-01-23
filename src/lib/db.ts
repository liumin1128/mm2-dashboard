import { MongoClient, Db } from 'mongodb'

const MONGODB_URI =
  'mongodb+srv://970568830:SQcRHyV1mBm2BM5Z@cluster0.mpblvjc.mongodb.net/?appName=Cluster0'
const DB_NAME = 'mm2'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(): Promise<{
  client: MongoClient
  db: Db
}> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()

  const db = client.db(DB_NAME)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase()
  return db
}
