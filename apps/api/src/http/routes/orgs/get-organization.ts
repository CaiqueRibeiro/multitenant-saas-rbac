import { auth } from "@/http/middlewares/auth"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

const getOrganizationSchema = z.object({
    slug: z.string()
})

const responseSchema = z.object({
    organization: z.object({
        id: z.string().uuid(),
        name: z.string(),
        slug: z.string(),
        domain: z.string().nullable(),
        shouldAttachUsersByDomain: z.boolean(),
        avatarUrl: z.string().url().nullable(),
        createdAt: z.date(),
        updatedAt: z.date(),
        ownerId: z.string().uuid(),
    })
})

export async function getOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(auth)
        .get('/organizations/:slug', {
            schema: {
                tags: ['Organizations'],
                summary: 'Get details from organization',
                security: [{ bearerAuth: [] }],
                params: getOrganizationSchema,
                response: {
                    200: responseSchema
                }
            }
        }, async (request) => {
            const { slug } = request.params
            const { organization } = await request.getUserMembership(slug)
            return { organization }
        })
}   