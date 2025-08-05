import { Collection, Db, MongoClient} from "mongodb";

/**
 * Глобальные переменные для хранения подключения к MongoDB
 */
let client: MongoClient | null = null;
let database: Db | null = null;

/**
 * URL-адрес MongoDB
 */
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcode-generator';

/**
 * Имя базы данных
 */
const DB_NAME = process.env.MONGODB_DB || 'barcode-generator';

const connectToDatabase = async (): Promise<{ client: MongoClient; db: Db }> => {
    if (!client) {
        // Если клиент не существует, создаем его
        client = new MongoClient(MONGO_URI)
        await client.connect()
    }

    if (!database) {
        // Если база данных не выбрана, выбираем её
        database = client.db(DB_NAME)
    }

    return { client, db: database }
}

/**
 * Получение базы данных MongoDB
 * @returns База данных MongoDB
 */
export const getDb = async (): Promise<Db> => {
    const { db } = await connectToDatabase()
    return db
}

/**
 * Получение коллекции MongoDB
 * @param collectionName Имя коллекции
 * @returns Коллекция MongoDB
 */
export const getCollection = async (collectionName: string): Promise<Collection> => {
    const db = await getDb()
    return db.collection(collectionName)
}
