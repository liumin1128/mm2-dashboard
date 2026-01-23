import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = process.env.MONGODB_DB || 'mm2'

if (!MONGODB_URI) {
  throw new Error('请在环境变量中设置 MONGODB_URI')
}

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
