import { auth } from "@/http/middlewares/auth"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getUserPermissions } from "@/utils/get-user-permissions"
import { UnauthorizedError } from "../_errors/unauthorized-error"

const getProjectSchema = z.object({
    projects: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        description: z.string(),
        slug: z.string(),
        ownerId: z.string().uuid(),
        avatarUrl: z.string().nullable(),
        organizationId: z.string().uuid(),
        createdAt: z.date(),
        owner: z.object({
            id: z.string().uuid(),
            name: z.string().nullable(),
            avatarUrl: z.string().nullable()
        })
    }))
})

export async function getProjects(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).get('/organizations/:slug/projects', {
        schema: {
            tags: ['Projects'],
            summary: 'Get details of a project',
            security: [{ bearerAuth: [] }],
            params: z.object({
                slug: z.string(),
            }),
            response: {
                200: getProjectSchema,
            }
        }
    }, async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('get', 'Project')) {
            throw new UnauthorizedError('Not allowed to see organization projects')
        }

        const projects = await prisma.project.findMany({
            where: {
                organizationId: organization.id
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                ownerId: true,
                avatarUrl: true,
                organizationId: true,
                createdAt: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    }
                }
            }
        })

        reply.status(201).send({ projects })
    })
}