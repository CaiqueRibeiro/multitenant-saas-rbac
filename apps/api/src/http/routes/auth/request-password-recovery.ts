import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const passwordRecoverySchema = z.object({
    email: z.string()
})

export async function requestPasswordRecovery(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/password/recover', {
        schema: {
            tags: ['Auth'],
            summary: 'Request password recovery code',
            body: passwordRecoverySchema,
            response: {
                201: z.null()
            }
        }
    }, async (request, reply) => {
        const { email } = request.body

        const userFromEmail = await prisma.user.findUnique({
            where: { email }
        })

        if (!userFromEmail) {
            // We don't want to leak information about the existence of the user
            return reply.status(201).send()
        }

        await prisma.token.create({
            data: {
                type: 'PASSWORD_RECOVER',
                userId: userFromEmail.id
            }
        })

        // TODO: send e-mail password recover link
        return reply.status(201).send()
    })
}