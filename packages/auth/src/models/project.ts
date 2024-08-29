import { z } from "zod"

export const projectSchema = z.object({
    __typename: z.literal('Project').default('Project'), // for CASL management
    id: z.string(),
    ownerId: z.string(),
})

export type Project = z.infer<typeof projectSchema>