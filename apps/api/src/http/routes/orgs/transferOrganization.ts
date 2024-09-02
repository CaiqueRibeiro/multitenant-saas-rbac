import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { organizationSchema } from "@saas/auth"
import { auth } from "@/http/middlewares/auth"
import { prisma } from "@/lib/prisma"
import { UnauthorizedError } from "../_errors/unauthorized-error"
import { BadRequestError } from "../_errors/bad-request-error"
import { getUserPermissions } from "@/utils/get-user-permissions"

export async function transferOrganization(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).patch('/organizations/:slug/owner', {
        schema: {
            tags: ['Organizations'],
            summary: 'Transfers organization ownership',
            security: [{ bearerAuth: [] }],
            body: z.object({
                transferToUserId: z.string(),
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

        const { cannot } = getUserPermissions(userId, membership.role)
        const authOrganization = organizationSchema.parse(organization)

        if (cannot('transfer_ownership', authOrganization)) {
            throw new UnauthorizedError('You are not allowed to transfer this organization ownership')
        }

        const { transferToUserId } = request.body

        const transferToMembership = await prisma.member.findUnique({
            where: {
                userId_organizationId: {
                    organizationId: organization.id,
                    userId: transferToUserId
                }
            }
        })

        if (!transferToMembership) {
            throw new BadRequestError('Target user is not a member of this organization')
        }

        await prisma.$transaction(
            [
                prisma.member.update({
                    where: {
                        userId_organizationId: {
                            organizationId: organization.id,
                            userId: transferToUserId
                        }
                    },
                    data: {
                        role: 'ADMIN'
                    }
                }),
                prisma.organization.update({
                    where: { id: organization.id },
                    data: {
                        ownerId: transferToUserId
                    }
                })
            ]
        )

        return reply.status(204).send()
    })
}