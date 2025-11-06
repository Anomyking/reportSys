import Stat from "../models/statModel.js";

/**
 * @desc    Create a new stats entry (for revenue, profit, etc.)
 * @route   POST /api/v1/stats
 * @access  Private (Admin, Superadmin)
 */
export const createStat = async (req, res, next) => {
  try {
    const { totalRevenue, totalProfit, totalInventory } = req.body;

    // Get admin ID from the 'protect' middleware
    const submittedBy = req.user.id;

    const stat = await Stat.create({
      totalRevenue,
      totalProfit,
      totalInventory,
      submittedBy,
    });

    res.status(201).json({ success: true, data: stat });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all stats entries (for the chart)
 * @route   GET /api/v1/stats
 * @access  Private (Admin, Superadmin)
 */
export const getAllStats = async (req, res, next) => {
  try {
    // Sort by createdAt ascending to get a proper timeline for the chart
    const stats = await Stat.find({}).sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: stats.length, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get the single latest stat entry (for the Bento Grid)
 * @route   GET /api/v1/stats/latest
 * @access  Private (Admin, Superadmin)
 */
export const getLatestStat = async (req, res, next) => {
  try {
    // Sort by createdAt descending and get the first one
    const latestStat = await Stat.findOne({}).sort({ createdAt: -1 });

    if (!latestStat) {
      return res
        .status(404)
        .json({ success: false, message: "No stats found" });
    }

    res.status(200).json({ success: true, data: latestStat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};