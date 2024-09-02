import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { projectSchema } from "@saas/auth"
import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { NotFoundError } from "../_errors/not-found-error"

export async function deleteProject(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).delete('/organizations/:orgZlug/projects/:projectSlug', {
        schema: {
            tags: ['Projects'],
            summary: 'Deletes a project',
            security: [{ bearerAuth: [] }],
            params: z.object({
                orgZlug: z.string(),
                projectSlug: z.string(),
            }),
            response: {
                204: z.null(),
            }
        }
    }, async (request, reply) => {
        const userId = await request.getCurrentUserId()
        const { orgZlug, projectSlug } = request.params
        const { membership, organization } = await request.getUserMembership(orgZlug)

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

        if (cannot('delete', authProject)) {
            throw new UnauthorizedError('You are not allowed to delete this project')
        }

        await prisma.project.delete({
            where: {
                id: authProject.id,
                organizationId: organization.id
            }
        })

        return reply.status(204).send()
    })
}