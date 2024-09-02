import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { UnauthorizedError } from "../_errors/unauthorized-error";
import { roleSchema } from "@saas/auth";

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

export async function getInvites(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations/:slug/invites', {
        schema: {
            tags: ['Invites'],
            summary: 'Get all organization invites',
            security: [{ bearerAuth: [] }],
            params: z.object({
                slug: z.string()
            }),
            response: {
                201: getInvitesSchema
            }
        }
    }, async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('get', 'Invite')) {
            throw new UnauthorizedError('Not allowed to get organization invites')
        }

        const invites = await prisma.invite.findMany({
            where: {
                organizationId: organization.id
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