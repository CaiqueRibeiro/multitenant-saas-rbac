import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { NotFoundError } from "../_errors/not-found-error"
import { auth } from "@/http/middlewares/auth"

const userSchema = z.object({
    user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
        avatarUrl: z.string().nullable()
    })
})

export async function getProfile(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/profile', {
        schema: {
            tags: ['Auth'],
            summary: 'Get authenticated user profile',
            response: {
                200: userSchema,
                400: z.object({
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const user = await prisma.user.findUnique({
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
            },
            where: { id: userId }
        })

        if (!user) {
            throw new NotFoundError('User not found.')
        }


        return reply.status(200).send({ user })
    })
}