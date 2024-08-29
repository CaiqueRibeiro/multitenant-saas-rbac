import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { compare, hash } from 'bcryptjs'
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { UnauthorizedError } from "../_errors/unauthorized-error"

const bodySchema = z.object({
    code: z.string(),
    password: z.string().min(6)
})

export async function resetPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/password/reset', {
        schema: {
            tags: ['Auth'],
            summary: 'Reset user password',
            body: bodySchema,
            response: {
                204: z.null()
            }
        }
    }, async (request, reply) => {
        const { code, password } = request.body

        const tokenFromCode = await prisma.token.findUnique({
            where: { id: code }
        })

        if (!tokenFromCode) {
            throw new UnauthorizedError()
        }

        if (tokenFromCode.type !== 'PASSWORD_RECOVER') {
            throw new BadRequestError('Invalid token.')
        }

        const passwordHash = await hash(password, 6)

        await prisma.user.update({
            where: { id: tokenFromCode.userId },
            data: {
                passwordHash
            }
        })

        await prisma.token.delete({
            where: { id: code }
        })

        return reply.status(204).send()
    })
}