import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { roleSchema } from "@saas/auth"

const getInviteSchema = z.object({
    invite: z.object({
        id: z.string(),
        organization: z.object({
            name: z.string(),
        }),
        createdAt: z.date(),
        role: roleSchema,
        email: z.string().email(),
        author: z.object({
            id: z.string().uuid(),
            name: z.string().nullable(),
            avatarUrl: z.string().nullable()
        }).nullable()
    })
})

export async function getInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/invites/:id', {
        schema: {
            tags: ['Invites'],
            summary: 'Get invite details',
            params: z.object({
                id: z.string().uuid()
            }),
            response: {
                200: getInviteSchema
            }
        }
    }, async (request, reply) => {
        const { id } = request.params

        const invite = await prisma.invite.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true
                    }
                },
                organization: {
                    select: {
                        name: true
                    }
                }
            }
        })

        if (!invite) {
            throw new BadRequestError('Invite not found')
        }

        reply.status(200).send({ invite })
    })
}