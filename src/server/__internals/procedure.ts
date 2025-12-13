import { Context } from "hono"
import { z } from "zod"
import superjson from "superjson"
import { Middleware, MutationOperation, QueryOperation } from "./types"
import { Bindings } from "../env"

declare module "hono" {
  interface Context {
    superjson: <T>(data: T, status?: number) => Response
  }
}

export class Procedure<Ctx = {}> {
  private readonly middlewares: Middleware<Ctx>[]

  constructor(middlewares: Middleware<Ctx>[] = []) {
    this.middlewares = middlewares
    if (!this.middlewares.some((mw) => mw.name === "superjsonMiddleware")) {
      this.middlewares.push(this.superjsonMiddleware as any)
    }
  }

  private superjsonMiddleware: Middleware<Ctx> = async ({
    c,
    next,
  }) => {
    c.superjson = <T>(data: T, status = 200) => {
      return new Response(superjson.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/superjson",
        },
      })
    }
    return next()
  }

  use<T, R = {}>(
    fn: ({
      ctx,
      next,
      c,
    }: {
      ctx: Ctx
      next: <B>(args?: B) => Promise<B & Ctx>
      c: Context<{ Bindings: Bindings }>
    }) => Promise<R>
  ): Procedure<Ctx & T & R> {
    return new Procedure<Ctx & T & R>([...this.middlewares, fn as any])
  }

  input<Schema extends Record<string, unknown>>(schema: z.ZodSchema<Schema>) {
    return {
      query: <Output>(
        handler: (args: {
          input: Schema
          ctx: Ctx
          c: Context<{ Bindings: Bindings }>
        }) => Output | Promise<Output>
      ): QueryOperation<Schema, Schema, Output> => ({
        type: "query" as const,
        schema,
        handler,
        middlewares: this.middlewares,
      }),

      mutation: <Output>(
        handler: (args: {
          input: Schema
          ctx: Ctx
          c: Context<{ Bindings: Bindings }>
        }) => Output | Promise<Output>
      ): MutationOperation<Schema, Schema, Output> => ({
        type: "mutation" as const,
        schema,
        handler,
        middlewares: this.middlewares,
      }),
    }
  }

  query<Output>(
    handler: (args: {
      ctx: any
      c: Context
      input: unknown
    }) => Output | Promise<Output>
  ): QueryOperation<{}, unknown, Output> {
    return {
      type: "query",
      handler,
      middlewares: this.middlewares,
    }
  }

  mutation<Output>(
    handler: (args: {
      ctx: any
      c: Context
      input: unknown
    }) => Output | Promise<Output>
  ): MutationOperation<{}, unknown, Output> {
    return {
      type: "mutation",
      handler,
      middlewares: this.middlewares,
    }
  }
}