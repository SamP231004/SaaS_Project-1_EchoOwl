import { httpHandler } from "@/server"

export const runtime = "nodejs"

export const dynamic = "force-dynamic"

export { httpHandler as GET, httpHandler as POST }