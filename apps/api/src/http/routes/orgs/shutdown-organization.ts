import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { organizationSchema } from "@saas/auth"
import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { getUserPermissions } from "@/utils/get-user-permissions"

export async function shutdownOrganization(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).delete('/organizations/:slug', {
        schema: {
            tags: ['Organizations'],
            summary: 'Shutdown an organization',
            security: [{ bearerAuth: [] }],
            params: z.object({
                slug: z.string()
            }),
            response: {
                204: z.null(),
            }
        }
    }, async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { slug } = request.params
        const { membership, organization } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)
        const authOrganization = organizationSchema.parse(organization)

        if (cannot('delete', authOrganization)) {
            throw new UnauthorizedError('You are not allowed to shutdown this organization')
        }

        await prisma.organization.delete({
            where: { id: organization.id }
        })

        return reply.status(204).send()
    })
}