import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { projectSchema } from "@saas/auth"
import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { NotFoundError } from "../_errors/not-found-error"

export async function updateProject(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).put('/organizations/:orgSlug/projects/:projectSlug', {
        schema: {
            tags: ['Projects'],
            summary: 'Updates a project',
            security: [{ bearerAuth: [] }],
            params: z.object({
                orgSlug: z.string(),
                projectSlug: z.string(),
            }),
            body: z.object({
                name: z.string(),
                description: z.string(),
            }),
            response: {
                204: z.null(),
            }
        }
    }, async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { orgSlug, projectSlug } = request.params
        const { membership, organization } = await request.getUserMembership(orgSlug)

        const project = await prisma.project.findUnique({
            where: {
                slug: projectSlug,
                organizationId: organization.id
            }
        })

        if (!project) {
            throw new NotFoundError('Project not found')
        }

        const { cannot } = getUserPermissions(userId, membership.role)
        const authProject = projectSchema.parse(project)

        if (cannot('update', authProject)) {
            throw new UnauthorizedError('You are not allowed to update this project')
        }

        const { name, description } = request.body

        await prisma.project.update({
            where: {
                id: authProject.id,
                organizationId: organization.id
            },
            data: {
                name,
                description,
            }
        })

        return reply.status(204).send()
    })
}