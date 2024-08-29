import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const userSchema = z.object({
    user: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
        avatarUrl: z.string().nullable()
    })
})

export async function getProfile(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/profile', {
        schema: {
            tags: ['User'],
            summary: 'Get authenticated user profile',
            response: {
                200: userSchema,
                400: z.object({
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const { sub } = await request.jwtVerify<{ sub: string }>()

        const user = await prisma.user.findUnique({
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
            },
            where: { id: sub }
        })

        if (!user) {
            return reply.status(400).send({ message: 'User not found.' })
        }


        return reply.status(200).send({ user })
    })
}