import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { auth } from "@/http/middlewares/auth"
import { ForbiddenError } from "../_errors/forbidden-error"

export async function acceptInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>()
        .register(auth)
        .post('/invites/:id/accept', {
            schema: {
                tags: ['Invites'],
                summary: 'Accept an invite',
                params: z.object({
                    id: z.string().uuid()
                }),
                response: {
                    204: z.null()
                }
            }
        }, async (request, reply) => {
            const { id } = request.params
            const userId = await request.getCurrentUserId()

            const invite = await prisma.invite.findUnique({
                where: { id },
                include: {}
            })

            if (!invite) {
                throw new BadRequestError('Invite not found or expired')
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            })

            if (!user) {
                throw new BadRequestError('User not found')
            }

            if (invite.email !== user.email) {
                throw new ForbiddenError('This invite belongs to another user')
            }

            await prisma.$transaction([
                prisma.member.create({
                    data: {
                        organizationId: invite.organizationId,
                        userId,
                        role: invite.role
                    }
                }),
                prisma.invite.delete({
                    where: { id }
                })
            ])

            reply.status(204).send()
        })
}