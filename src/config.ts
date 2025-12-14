export const FREE_QUOTA = {
    maxEventsPerMonth: 100,
    maxEventCategories: 3,
} as const

export const PRO_QUOTA = {
    maxEventsPerMonth: 1000,
    maxEventCategories: 10,
} as const

export const PLANS = {
  FREE: FREE_QUOTA,
  PRO: PRO_QUOTA,
} as const

export type PlanKey = keyof typeof PLANS