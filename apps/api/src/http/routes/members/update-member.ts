import { auth } from "@/http/middlewares/auth"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { roleSchema } from "@saas/auth"

export async function updateMember(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations/:slug/members/:memberId', {
        schema: {
            tags: ['Projects'],
            summary: 'Update a member',
            security: [{ bearerAuth: [] }],
            params: z.object({
                slug: z.string(),
                memberId: z.string().uuid(),
            }),
            body: z.object({
                role: roleSchema
            }),
            response: {
                204: z.null(),
            }
        }
    }, async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('update', 'User')) {
            throw new UnauthorizedError('Not allowed to see update this member')
        }

        const { role } = request.body

        await prisma.member.update({
            where: {
                id: request.params.memberId,
                organizationId: organization.id
            },
            data: {
                role: role
            }
        })

        reply.status(204).send
    })
}