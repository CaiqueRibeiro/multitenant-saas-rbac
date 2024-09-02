import { auth } from "@/http/middlewares/auth"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { NotFoundError } from "../_errors/not-found-error"
import { projectSchema } from "@saas/auth"

const getProjectSchema = z.object({
    project: z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string(),
        slug: z.string(),
        ownerId: z.string().uuid(),
        avatarUrl: z.string().nullable(),
        organizationId: z.string().uuid(),
        owner: z.object({
            id: z.string().uuid(),
            name: z.string().nullable(),
            avatarUrl: z.string().nullable()
        })
    })
})

export async function getProject(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations/:orgZlug/projects/:projectSlug', {
        schema: {
            tags: ['Projects'],
            summary: 'Get details of a project',
            security: [{ bearerAuth: [] }],
            params: z.object({
                orgZlug: z.string(),
                projectSlug: z.string(),
            }),
            response: {
                200: getProjectSchema,
            }
        }
    }, async (request, reply) => {
        const { orgZlug, projectSlug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(orgZlug)

        const { cannot } = getUserPermissions(userId, membership.role)

        const project = await prisma.project.findUnique({
            where: {
                slug: projectSlug,
                organizationId: organization.id
            },
            select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                ownerId: true,
                avatarUrl: true,
                organizationId: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    }
                }
            }
        })

        const authProject = projectSchema.parse(project)

        if (cannot('get', authProject)) {
            throw new UnauthorizedError('Not allowed to get this project details')
        }

        if (!project) {
            throw new NotFoundError('Project not found')
        }

        reply.status(201).send({ project })
    })
}