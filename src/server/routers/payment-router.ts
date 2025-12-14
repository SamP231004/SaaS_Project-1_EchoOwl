import { createCheckoutSession } from "@/lib/stripe"
import { router } from "../__internals/router"
import { privateProcedure } from "../procedures"
import type { PlanKey } from "@/config"

export const paymentRouter = router({
    createCheckoutSession: privateProcedure.mutation(async ({ ctx }) => {
        const { user } = ctx

        const session = await createCheckoutSession({
            userEmail: user.email,
            userId: user.id,
        })

        return { url: session.url }
    }),

    getUserPlan: privateProcedure.query(async ({ ctx }) => {
        const { user } = ctx

        return {
            plan: user.plan as PlanKey,
        }
    })
})