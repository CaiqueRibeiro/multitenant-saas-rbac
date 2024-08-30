import { auth } from "@/http/middlewares/auth"
import { roleSchema } from "@saas/auth"
import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"

const getMembershipSchema = z.object({
    slug: z.string()
})

const responseSchema = z.object({
    membership: z.object({
        id: z.string().uuid(),
        role: roleSchema,
        organizationId: z.string().uuid()
    })
})

export async function getMembership(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(auth)
        .get('/organizations/:slug/membership', {
            schema: {
                tags: ['Organizations'],
                summary: 'Create an organization',
                security: [{ bearerAuth: [] }],
                params: getMembershipSchema,
                response: {
                    200: responseSchema
                }
            }
        }, async (request) => {
            const { slug } = request.params
            const { membership } = await request.getUserMembership(slug)
            return {
                membership: {
                    id: membership.id,
                    role: membership.role,
                    organizationId: membership.organizationId
                }
            }
        })
}   