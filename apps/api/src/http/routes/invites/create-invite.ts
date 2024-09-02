import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserPermissions } from "@/utils/get-user-permissions";
import { UnauthorizedError } from "../_errors/unauthorized-error";
import { roleSchema } from "@saas/auth";
import { BadRequestError } from "../_errors/bad-request-error";

export async function createInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(auth).post('/organizations/:slug/invites', {
        schema: {
            tags: ['Invites'],
            summary: 'Create an invite',
            security: [{ bearerAuth: [] }],
            body: z.object({
                email: z.string().email(),
                role: roleSchema,
            }),
            params: z.object({
                slug: z.string()
            }),
            response: {
                201: z.object({
                    inviteId: z.string().uuid()
                }),
            }
        }
    }, async (request, reply) => {
        const { slug } = request.params
        const userId = await request.getCurrentUserId()
        const { organization, membership } = await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('create', 'Invite')) {
            throw new UnauthorizedError('Not allowed to create new invites')
        }

        const { email, role } = request.body
        const [, domain] = email.split('@')

        if (organization.shouldAttachUsersByDomain && domain === organization.domain) {
            throw new BadRequestError(`Users with ${domain} domain will join automatically on login`)
        }

        const inviteWithSameEmail = await prisma.invite.findUnique({
            where: {
                email_organizationId: {
                    email,
                    organizationId: organization.id
                }
            }
        })

        if (inviteWithSameEmail) {
            throw new BadRequestError('Invite with same email already exists')
        }

        const memberWithSameEmail = await prisma.member.findFirst({
            where: {
                organizationId: organization.id,
                user: {
                    email
                }
            }
        })

        if (memberWithSameEmail) {
            throw new BadRequestError('A member with same email already exists')
        }

        const invite = await prisma.invite.create({
            data: {
                email,
                role,
                organizationId: organization.id,
                authorId: userId,
            }
        })

        reply.status(201).send({ inviteId: invite.id })
    })
}