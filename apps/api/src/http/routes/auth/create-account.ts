import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

const bodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6)
})

export async function createAccount(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/users', {
        schema: { body: bodySchema }
    }, () => {
        return 'User created!'
    })
}