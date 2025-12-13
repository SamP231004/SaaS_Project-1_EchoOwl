import { db } from "@/db"
import { router } from "../__internals/router"
import { privateProcedure } from "../procedures"
import { startOfDay, startOfMonth, startOfWeek } from "date-fns"
import { z } from "zod"
import { CATEGORY_NAME_VALIDATOR } from "@/lib/validators/category-validator"
import { parseColor } from "@/utils"
import { HTTPException } from "hono/http-exception"

export const categoryRouter = router({
  getEventCategories: privateProcedure.query(async ({ ctx }) => {
    const firstDayOfMonth = startOfMonth(new Date())
    const categories = await db.eventCategory.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        name: true,
        emoji: true,
        color: true,
        updatedAt: true,
        createdAt: true,
        events: {
          where: { createdAt: { gte: firstDayOfMonth } },
          select: { fields: true, createdAt: true },
        },
        _count: {
          select: {
            events: { where: { createdAt: { gte: firstDayOfMonth } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const categoriesWithCounts = categories.map((category) => {
      const uniqueFieldNames = new Set<string>()
      let lastPing: Date | null = null

      category.events.forEach((event) => {
        Object.keys(event.fields as object).forEach((f) =>
          uniqueFieldNames.add(f)
        )
        if (!lastPing || event.createdAt > lastPing) {
          lastPing = event.createdAt
        }
      })

      return {
        id: category.id,
        name: category.name,
        emoji: category.emoji,
        color: category.color,
        updatedAt: category.updatedAt,
        createdAt: category.createdAt,
        uniqueFieldCount: uniqueFieldNames.size,
        eventsCount: category._count.events,
        lastPing,
      }
    })

    return { categories: categoriesWithCounts }
  }),

  createEventCategory: privateProcedure
    .input(
      z.object({
        name: CATEGORY_NAME_VALIDATOR,
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
        emoji: z.string().emoji().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("CREATE userId:", ctx.user.id)

      const eventCategory = await db.eventCategory.create({
        data: {
          name: input.name.toLowerCase(),
          color: parseColor(input.color),
          emoji: input.emoji,
          userId: ctx.user.id,
        },
      })

      return { eventCategory }
    }),

  deleteCategory: privateProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.eventCategory.delete({
        where: {
          name_userId: {
            name: input.name,
            userId: ctx.user.id,
          },
        },
      })

      return { success: true }
    }),

  insertQuickstartCategories: privateProcedure.mutation(async ({ ctx }) => {
    const result = await db.eventCategory.createMany({
      data: [
        { name: "bug", emoji: "🐛", color: 0xff6b6b },
        { name: "sale", emoji: "💰", color: 0xffeb3b },
        { name: "question", emoji: "🤔", color: 0x6c5ce7 },
      ].map((c) => ({ ...c, userId: ctx.user.id })),
    })

    return { success: true, count: result.count }
  }),

  pollCategory: privateProcedure
    .input(z.object({ name: CATEGORY_NAME_VALIDATOR }))
    .query(async ({ ctx, input }) => {
      const category = await db.eventCategory.findUnique({
        where: {
          name_userId: { name: input.name, userId: ctx.user.id },
        },
        include: { _count: { select: { events: true } } },
      })

      if (!category) {
        throw new HTTPException(404, {
          message: `Category "${input.name}" not found`,
        })
      }

      return { hasEvents: category._count.events > 0 }
    }),

  getEventsByCategoryName: privateProcedure
    .input(
      z.object({
        name: CATEGORY_NAME_VALIDATOR,
        page: z.number(),
        limit: z.number().max(50),
        timeRange: z.enum(["today", "week", "month"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date()

      const startDate =
        input.timeRange === "today"
          ? startOfDay(now)
          : input.timeRange === "week"
            ? startOfWeek(now)
            : startOfMonth(now)

      const [events, eventsCount] = await Promise.all([
        db.event.findMany({
          where: {
            EventCategory: { name: input.name, userId: ctx.user.id },
            createdAt: { gte: startDate },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        db.event.count({
          where: {
            EventCategory: { name: input.name, userId: ctx.user.id },
            createdAt: { gte: startDate },
          },
        }),
      ])

      return { events, eventsCount }
    }),
})