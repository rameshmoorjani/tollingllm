import { Request, Response, Router } from 'express';
import { MongoDBService } from '../services/mongodbService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const mongoService = new MongoDBService();

// Get all transactions with filters and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      status,
      date_from,
      date_to,
      page = '1',
      limit = '20',
    } = req.query;

    const filter: any = {};

    if (customer_id) filter.customer_id = customer_id;
    if (status) filter.tollstatus = status;

    if (date_from || date_to) {
      filter.tolltime = {};
      if (date_from) filter.tolltime.$gte = new Date(date_from as string);
      if (date_to) filter.tolltime.$lte = new Date(date_to as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const transactions = await mongoService.getTransactions(
      filter,
      skip,
      parseInt(limit as string)
    );

    const total = await mongoService.countTransactions(filter);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Search transactions
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query required',
      });
    }

    const results = await mongoService.searchTransactions(q as string);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get single transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transaction = await mongoService.getTransactionById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Export as CSV
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { customer_id } = req.query;

    const filter: any = {};
    if (customer_id) filter.customer_id = customer_id;

    const transactions = await mongoService.getTransactions(filter, 0, 10000);

    // Create CSV header
    const headers = [
      'Customer ID',
      'Toll Time',
      'Toll Status',
      'Toll Point',
      'Amount',
      'Timezone',
      'State',
      'Connection Status',
    ];

    let csv = headers.join(',') + '\n';

    // Add rows
    transactions.forEach((t: any) => {
      csv += [
        t.customer_id,
        t.tolltime,
        t.tollstatus,
        t.toll_point_name,
        t.toll_amount,
        t.timezone,
        t.state,
        t.connection_status,
      ]
        .join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Import from CSV
router.post('/import/csv', async (req: Request, res: Response) => {
  try {
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'CSV data is required',
      });
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV file must contain header and at least one data row',
      });
    }

    // Parse header
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    // Parse data rows
    const transactions = [];
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map((v: string) => v.trim());
        
        if (values.length === 0 || values.every(v => v === '')) {
          continue; // Skip empty lines
        }

        const transaction: any = {
          _id: uuidv4(),
        };

        // Map CSV columns to transaction fields
        headers.forEach((header: string, index: number) => {
          const value = values[index];
          
          switch (header) {
            case 'customer_id':
              transaction.customer_id = value;
              break;
            case 'toll_time':
              transaction.tolltime = new Date(value);
              break;
            case 'toll_status':
              transaction.tollstatus = value;
              break;
            case 'toll_point':
              transaction.toll_point_name = value;
              break;
            case 'amount':
              transaction.toll_amount = parseFloat(value);
              break;
            case 'timezone':
              transaction.timezone = value;
              break;
            case 'state':
              transaction.state = value;
              break;
            case 'connection_status':
              transaction.connection_status = value;
              break;
          }
        });

        // Validate required fields
        if (!transaction.customer_id || !transaction.tolltime) {
          errorCount++;
          errors.push(`Row ${i + 1}: Missing customer_id or toll_time`);
          continue;
        }

        transactions.push(transaction);
        importedCount++;
      } catch (rowError: any) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    if (transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid transactions found in CSV',
        errors,
      });
    }

    // Insert transactions into MongoDB
    const result = await mongoService.insertTransactions(transactions);

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} transactions`,
      data: {
        importedCount,
        errorCount,
        errors: errorCount > 0 ? errors : [],
        insertedIds: result?.insertedIds || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
