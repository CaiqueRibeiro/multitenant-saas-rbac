import { z } from "zod"

export const organizationSchema = z.object({
    __typename: z.literal('Organization').default('Organization'), // for CASL management
    id: z.string(),
    ownerId: z.string(),
})

export type Organization = z.infer<typeof organizationSchema>