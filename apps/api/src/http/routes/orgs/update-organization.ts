import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { organizationSchema } from "@saas/auth"
import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { BadRequestError } from "../_errors/bad-request-error"
import { getUserPermissions } from "@/utils/get-user-permissions"

export async function updateOrganization(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organizations/:slug', {
        schema: {
            tags: ['Organizations'],
            summary: 'Updates an organization',
            security: [{ bearerAuth: [] }],
            body: z.object({
                name: z.string(),
                domain: z.string().nullish(),
                shouldAttachUsersByDomain: z.boolean().default(false),
            }),
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
        const { name, domain, shouldAttachUsersByDomain } = request.body

        const { cannot } = getUserPermissions(userId, membership.role)
        const authOrganization = organizationSchema.parse(organization)

        if (cannot('update', authOrganization)) {
            throw new UnauthorizedError('You are not allowed to update this organization')
        }

        if (domain) {
            const organizationByDomain = await prisma.organization.findFirst({
                where: {
                    domain,
                    id: { not: organization.id }
                }
            })
            if (organizationByDomain) {
                throw new BadRequestError('another organization with this domain already exists.')
            }
        }

        await prisma.organization.update({
            where: { id: organization.id },
            data: {
                name,
                domain,
                shouldAttachUsersByDomain,
            }
        })

        return reply.status(204).send()
    })
}