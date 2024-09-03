import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { UnauthorizedError } from "../_errors/unauthorized-error";
import { NotFoundError } from "../_errors/not-found-error";

export async function revokeInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organizations/:slug/invites/:id', {
        schema: {
            tags: ['Invites'],
            summary: 'Revoke an invite',
            security: [{ bearerAuth: [] }],
            params: z.object({
                slug: z.string(),
                id: z.string().uuid()
            }),
            response: {
                204: z.null()
            }
        }
    }, async (request, reply) => {
        const { slug, id } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('delete', 'Invite')) {
            throw new UnauthorizedError('Not allowed to delete this invite')
        }

        const invite = await prisma.invite.findUnique({
            where: {
                id: id,
                organizationId: organization.id
            }
        })

        if (!invite) {
            throw new NotFoundError('Invite not found')
        }

        await prisma.invite.delete({
            where: {
                id: id
            }
        })

        reply.status(204).send()
    })
}