/** Structure the app is designed around. If the live guide differs, stop and review. */
export const EXPECTED = {
  examCode: 'SAA-C03',
  domains: 4,
  tasksPerDomain: [3, 2, 5, 4],
  weights: [30, 26, 24, 20],
  /** Foundation buildings (background no bullet covers). Raised from 4 to 5 in Step 2. */
  maxFoundations: 5,
} as const;
