import { AbilityBuilder, CreateAbility, createMongoAbility, ForcedSubject, MongoAbility } from '@casl/ability';

const actions = ['manage', 'invite', 'delete'] as const
const subjects = ['User', 'all'] as const

type AppAbilities = [
    (typeof actions)[number],
    (
        | (typeof subjects)[number]
        | ForcedSubject<Exclude<(typeof subjects)[number], 'all'>>
    ),
]

export type AppAbility = MongoAbility<AppAbilities>
export const createAbility = createMongoAbility as CreateAbility<AppAbility>

const { build, can } = new AbilityBuilder(createAbility)

can('invite', 'User')

export const ability = build()
