import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { compare } from 'bcryptjs'
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"

const bodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

export async function authenticateWithPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/sessions/password', {
        schema: {
            tags: ['Auth'],
            summary: 'Authenticate with email and password',
            body: bodySchema,
            response: {
                201: z.object({
                    token: z.string()
                }),
                400: z.object({
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const { email, password } = request.body

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            throw new BadRequestError('Invalid credentials.')
        }

        if (user.passwordHash === null) {
            throw new BadRequestError('User without password. Use social login.')
        }

        const isPasswordValid = await compare(password, user.passwordHash)

        if (!isPasswordValid) {
            throw new BadRequestError('Invalid credentials.')
        }

        const token = await reply.jwtSign({
            sub: user.id
        }, {
            sign: {
                expiresIn: '7d'
            }
        })

        return reply.status(201).send({ token })
    })
}