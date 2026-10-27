// AI Build PC orchestration contract. Defines the real input/output shape a
// future recommendation engine must honor, and documents the two
// integration points that are NOT optional per task scope: every
// recommended component must come from searchProducts()
// (../tools/productSearch.tool.js — real MySQL data, real product IDs, real
// prices) and every compatibility verdict must come from
// checkBuildCompatibility() (../tools/compatibility.tool.js — the official
// Compatibility Engine). An LLM is never allowed to invent a component or
// declare compatibility itself.
//
// No recommendation logic is implemented yet (task scope: no automatic AI
// Build PC feature in this phase) — prepareBuildPcRecommendation() validates
// its input for real, then reports "not available" rather than guessing.

const USAGE_TYPES = new Set(['gaming', 'programming', 'design', 'study', 'office']);

/**
 * @typedef {Object} BuildPcRequest
 * @property {number} budget                 - VNĐ, required, > 0
 * @property {string} usage                  - one of USAGE_TYPES
 * @property {string} [performancePriority]   - free-text hint, e.g. "ưu tiên CPU"
 * @property {string} [preferredBrand]
 * @property {{ slot: string, productId: number }[]} [existingComponents] - parts the customer already owns/wants to keep
 * @property {string} [constraints]           - free-text, e.g. "không cần màn hình"
 */

/**
 * @typedef {Object} BuildPcRecommendation
 * @property {{ slot: string, productId: number, name: string, price: number }[]} components
 * @property {number} totalPrice
 * @property {object} compatibility           - result of checkBuildCompatibility()
 * @property {string} explanation
 * @property {BuildPcRecommendation|null} alternative
 */

/**
 * Real, standalone-testable validation — not gated on AI being enabled, so
 * a future recommendation engine (and its tests) can validate input the
 * same way regardless of provider status.
 * @param {BuildPcRequest} input
 * @returns {BuildPcRequest}
 */
export function validateBuildPcRequest(input = {}) {
  const budget = Number(input.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    const error = new Error('budget phải là số dương (VNĐ).');
    error.statusCode = 400;
    throw error;
  }
  const usage = String(input.usage ?? '').trim().toLowerCase();
  if (!USAGE_TYPES.has(usage)) {
    const error = new Error(`usage phải là một trong: ${[...USAGE_TYPES].join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }
  const existingComponents = Array.isArray(input.existingComponents)
    ? input.existingComponents.filter(c => typeof c?.slot === 'string' && Number.isInteger(c?.productId))
    : [];
  return {
    budget,
    usage,
    performancePriority: String(input.performancePriority ?? '').trim().slice(0, 200),
    preferredBrand: String(input.preferredBrand ?? '').trim().slice(0, 100),
    existingComponents,
    constraints: String(input.constraints ?? '').trim().slice(0, 500),
  };
}

/**
 * The integration point a future recommendation engine fills in. When
 * implemented, the required call order is: (1) searchProducts() scoped to
 * `budget`/`usage` to get real candidate products, (2) assemble a config
 * from those real product IDs, (3) checkBuildCompatibility() on that config
 * before ever returning it — never skip or reorder these two calls, and
 * never fabricate a product ID or a compatibility verdict.
 * @param {BuildPcRequest} rawInput
 * @returns {Promise<BuildPcRecommendation>} never resolves in this phase — always throws
 */
export async function prepareBuildPcRecommendation(rawInput) {
  validateBuildPcRequest(rawInput); // real validation, always runs
  const error = new Error('AI Build PC chưa có bộ chọn cấu hình (recommendation engine) — chức năng tự động chưa được triển khai trong giai đoạn này.');
  error.statusCode = 501;
  error.code = 'AI_BUILD_PC_NOT_IMPLEMENTED';
  throw error;
}
