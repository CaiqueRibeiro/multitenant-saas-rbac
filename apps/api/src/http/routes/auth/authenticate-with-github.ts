import type { FastifyInstance } from "fastify"
import type { ZodTypeProvider } from "fastify-type-provider-zod"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { BadRequestError } from "../_errors/bad-request-error"
import { env } from "@saas/env"

const bodySchema = z.object({
    code: z.string().email()
})

const githubAccessTokenSchema = z.object({
    access_token: z.string(),
    token_type: z.literal('bearer'),
    scope: z.string()
})

const githubUserSchema = z.object({
    id: z.number().int().transform(String), // get number but in BD it's string
    avatar_url: z.string().url(),
    name: z.string().nullable(),
    email: z.string().email().nullable()
})

export async function authenticateWithGithub(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/sessions/github', {
        schema: {
            tags: ['Auth'],
            summary: 'Authenticate with github',
            body: bodySchema,
            response: {
                201: z.object({
                    token: z.string()
                }),
                400: z.object({
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const { code } = request.body

        const githubOauthUrl = new URL(env.GITHUB_OAUTH_ACCESS_TOKEN_URL)

        githubOauthUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID)
        githubOauthUrl.searchParams.set('client_secret', env.GITHUB_OAUTH_CLIENT_SECRET)
        githubOauthUrl.searchParams.set('redirect_uri', env.GITHUB_OAUTH_REDIRECT_URI)
        githubOauthUrl.searchParams.set('code', code)

        const githubAccessTokenResponse = await fetch(githubOauthUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json'
            }
        })

        const githubAccessTokenData = await githubAccessTokenResponse.json()

        const { access_token: GithubAccessToken } = githubAccessTokenSchema.parse(githubAccessTokenData)

        const githubUserResponse = await fetch(env.GITHUB_OAUTH_USER_URL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${GithubAccessToken}`
            }
        })

        const githubUserData = await githubUserResponse.json()

        const {
            id: githubId,
            name,
            email,
            avatar_url: avatarUrl
        } = githubUserSchema.parse(githubUserData)

        if (!email) {
            throw new BadRequestError('You github account must have an email to authenticate')
        }

        let user = await prisma.user.findUnique({
            where: {
                email
            }
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    avatarUrl
                }
            })
        }

        let account = await prisma.account.findUnique({
            where: {
                provider_userId: {
                    provider: 'GITHUB',
                    userId: user.id,
                }
            }
        })

        if (!account) {
            account = await prisma.account.create({
                data: {
                    provider: 'GITHUB',
                    providerAccountId: githubId,
                    userId: user.id
                }
            })
        }

        const token = await reply.jwtSign({
            sub: user.id
        }, {
            sign: {
                expiresIn: '7d'
            }
        })

        return reply.status(201).send({ token })
    })
}