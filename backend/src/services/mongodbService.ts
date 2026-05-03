import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

interface Transaction {
  _id?: ObjectId;
  customer_id: string;
  tolltime: Date;
  tollstatus: string;
  toll_point_name: string;
  toll_amount: number;
  timezone: string;
  state: string;
  connection_status: boolean;
  created_at?: Date;
}

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<Transaction> | null = null;

  async connect(): Promise<void> {
    if (this.client) return;

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE || 'tolling_db';
    const collectionName = process.env.MONGODB_COLLECTION || 'transactions';

    try {
      this.client = new MongoClient(mongoUri, { 
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000 
      });
      await this.client.connect();

      this.db = this.client.db(dbName);
      this.collection = this.db.collection<Transaction>(collectionName);

      console.log('✅ Connected to MongoDB');
    } catch (error: any) {
      console.error('⚠️  MongoDB connection failed:', error.message);
      console.log('💡 Tip: Set MONGODB_URI environment variable to a valid MongoDB Atlas connection string');
      // Don't rethrow - allow app to start without MongoDB
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
      console.log('❌ Disconnected from MongoDB');
    }
  }

  async getTransactions(
    filter: any = {},
    skip: number = 0,
    limit: number = 20
  ): Promise<Transaction[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection.find(filter).skip(skip).limit(limit).toArray();
  }

  async countTransactions(filter: any = {}): Promise<number> {
    await this.connect();
    if (!this.collection) return 0;
    return this.collection.countDocuments(filter);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    await this.connect();
    if (!this.collection) return null;
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async searchTransactions(query: string): Promise<Transaction[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection
      .find({
        $or: [
          { toll_point_name: { $regex: query, $options: 'i' } },
          { customer_id: { $regex: query, $options: 'i' } },
          { state: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(50)
      .toArray();
  }

  async getCustomerTransactions(customerId: string): Promise<Transaction[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection.find({ customer_id: customerId }).toArray();
  }

  async getAllTransactions(): Promise<Transaction[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection.find({}).toArray();
  }

  async getMaxTollTransaction(): Promise<any> {
    await this.connect();
    if (!this.collection) return null;
    const result = await this.collection
      .find({})
      .sort({ toll_amount: -1 })
      .limit(1)
      .toArray();
    return result[0] || null;
  }

  async getTopCustomers(limit: number = 10): Promise<any[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection
      .aggregate([
        {
          $group: {
            _id: '$customer_id',
            total_amount: { $sum: '$toll_amount' },
            transaction_count: { $sum: 1 },
            max_toll: { $max: '$toll_amount' },
            min_toll: { $min: '$toll_amount' },
            avg_toll: { $avg: '$toll_amount' },
          },
        },
        { $sort: { total_amount: -1 } },
        { $limit: limit },
      ])
      .toArray();
  }

  async getCustomerStats(): Promise<any[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection
      .aggregate([
        {
          $group: {
            _id: '$customer_id',
            total_amount: { $sum: '$toll_amount' },
            transaction_count: { $sum: 1 },
            max_toll: { $max: '$toll_amount' },
            min_toll: { $min: '$toll_amount' },
            avg_toll: { $avg: '$toll_amount' },
            locations: { $push: '$toll_point_name' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();
  }

  async insertTransactions(transactions: any[]): Promise<any> {
    await this.connect();
    if (!this.collection) return { insertedCount: 0 };
    return this.collection.insertMany(transactions);
  }

  async aggregateTransactions(pipeline: any[]): Promise<any[]> {
    await this.connect();
    if (!this.collection) return [];
    return this.collection.aggregate(pipeline).toArray();
  }
}
