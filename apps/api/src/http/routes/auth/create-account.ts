import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { hash } from 'bcryptjs'
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"

const bodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6)
})

export async function createAccount(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/users', {
        schema: {
            tags: ['Auth'],
            summary: 'Create a new account',
            body: bodySchema
        }
    }, async (request, reply) => {
        const { name, email, password } = request.body

        const userWithSameEmail = await prisma.user.findUnique({
            where: { email }
        })

        if (userWithSameEmail) {
            throw new BadRequestError('user with same e-mail already exists')
        }

        const [, domain] = email.split('@') // gets domain
        const autoJoinOrganization = await prisma.organization.findFirst({
            where: {
                domain,
                shouldAttachUsersByDomain: true
            }
        })

        const passwordHash = await hash(password, 6)

        await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                member_on: autoJoinOrganization ? {
                    create: {
                        organizationId: autoJoinOrganization.id
                    }
                } : undefined
            }
        })

        return reply.status(201).send()
    })
}