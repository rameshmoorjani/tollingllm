import { Request, Response, Router } from 'express';
import { MongoDBService } from '../services/mongodbService';

const router = Router();
const mongoService = new MongoDBService();

// Get maximum toll amount across all customers
router.get('/max-toll', async (req: Request, res: Response) => {
  try {
    const maxTransaction = await mongoService.getMaxTollTransaction();

    if (!maxTransaction) {
      return res.json({
        success: true,
        data: {
          message: 'No transactions found',
          max_toll: null,
          customer_id: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        max_toll: maxTransaction.toll_amount,
        customer_id: maxTransaction.customer_id,
        toll_point: maxTransaction.toll_point_name,
        date: maxTransaction.tolltime,
        status: maxTransaction.tollstatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get top customers by total spending
router.get('/top-customers', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const topCustomers = await mongoService.getTopCustomers(limit);

    res.json({
      success: true,
      data: topCustomers.map((c: any) => ({
        customer_id: c._id,
        total_spent: parseFloat(c.total_amount.toFixed(2)),
        transaction_count: c.transaction_count,
        max_toll: parseFloat(c.max_toll.toFixed(2)),
        min_toll: parseFloat(c.min_toll.toFixed(2)),
        avg_toll: parseFloat(c.avg_toll.toFixed(2)),
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get statistics for all customers
router.get('/customer-stats', async (req: Request, res: Response) => {
  try {
    const stats = await mongoService.getCustomerStats();

    res.json({
      success: true,
      data: stats.map((c: any) => ({
        customer_id: c._id,
        total_spent: parseFloat(c.total_amount.toFixed(2)),
        transaction_count: c.transaction_count,
        max_toll: parseFloat(c.max_toll.toFixed(2)),
        min_toll: parseFloat(c.min_toll.toFixed(2)),
        avg_toll: parseFloat(c.avg_toll.toFixed(2)),
        locations: [...new Set(c.locations)],
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
