import * as service from '../services/adminDashboard.service.js';

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

export const getDashboard = asyncHandler(async (req, res) => {
  const { range, from, to } = req.query;
  const allowedRanges = ['7d', '30d', 'month', '12m', 'custom'];
  const safeRange = allowedRanges.includes(range) ? range : '7d';
  const data = await service.getDashboard({ range: safeRange, from, to });
  res.json(data);
});
