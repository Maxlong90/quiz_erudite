// SportQuiz difficulty audit (2026-09-03) of the non-image "question"-type pool
// (309 text/date questions; image questions and Sports Legends are NOT rated).
// Drives the Classic play order: text questions are laid out strictly
// EASY → MEDIUM → HARD, so the earliest levels are the most approachable and the
// hardest land at the very end. Any non-image question NOT listed here defaults
// to MEDIUM, so new backend questions slot into the middle without breaking.
export const EASY_QUESTION_IDS: ReadonlySet<number> = new Set([
  4562, 4568, 4722, 4725, 4730, 4736, 4737, 4808, 4820, 4824,
  4855, 4857, 4877, 4898, 4902, 4904, 4908, 4954, 4955, 4964,
  4968, 4971, 4976, 4987, 5006, 5008, 5010, 5074, 5079, 5083,
  5085, 5086, 5093, 5099, 5113, 5123, 5128, 5129, 5133, 5181,
  5184, 5205, 5212, 5224, 5238,
]);

export const HARD_QUESTION_IDS: ReadonlySet<number> = new Set([
  4633, 4688, 4691, 4694, 4697, 4698, 4700, 4728, 4735, 4738,
  4751, 4754, 4755, 4817, 4827, 4865, 4867, 4900, 4912, 4916,
  4924, 4936, 4944, 4945, 4946, 4948, 4953, 4957, 4961, 4963,
  4965, 4978, 4992, 4995, 5001, 5031, 5039, 5042, 5045, 5046,
  5055, 5060, 5084, 5115, 5148, 5149, 5152, 5215, 5216, 5223,
  5226, 5227, 5232, 5234, 5236, 5239, 5503, 5504, 5505, 5506,
  5507, 5508, 5509, 5510, 5511, 5512, 5513,
]);
