import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { UnauthorizedError } from "../_errors/unauthorized-error";
import { roleSchema } from "@saas/auth";
import { NotFoundError } from "../_errors/not-found-error";

const getInvitesSchema = z.object({
    invites: z.array(z.object({
        id: z.string(),
        email: z.string().email(),
        role: roleSchema,
        createdAt: z.date(),
        author: z.object({
            id: z.string().uuid(),
            name: z.string().nullable(),
        }).nullable()
    }))
})

export async function getPendingInvites(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/pending-invites', {
        schema: {
            tags: ['Invites'],
            summary: 'Get all user pending invites',
            security: [{ bearerAuth: [] }],
            response: {
                201: getInvitesSchema
            }
        }
    }, async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new NotFoundError('User not found')
        }

        const invites = await prisma.invite.findMany({
            where: {
                email: user.email,
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })


        reply.status(200).send({ invites })
    })
}