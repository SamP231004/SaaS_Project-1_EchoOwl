import { Context } from "hono"
import { z } from "zod"
import { httpHandler } from "@/server"

export type Middleware<I> = ({
  ctx,
  next,
  c,
}: {
  ctx: I
  next: <B>(args?: B) => B & I
  c: Context
}) => Promise<any>

export type QueryOperation<
  Schema extends Record<string, unknown> = {},
  Input = unknown,
  Output = unknown
> = {
  type: "query"
  schema?: z.ZodType<Schema>
  handler: (args: {
    ctx: any
    c: Context
    input: Input
  }) => Output | Promise<Output>
  middlewares: Middleware<any>[]
}

export type MutationOperation<
  Schema extends Record<string, unknown> = {},
  Input = unknown,
  Output = unknown
> = {
  type: "mutation"
  schema?: z.ZodType<Schema>
  handler: (args: {
    ctx: any
    c: Context
    input: Input
  }) => Output | Promise<Output>
  middlewares: Middleware<any>[]
}

export { httpHandler as GET, httpHandler as POST }