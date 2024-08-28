import { AbilityBuilder, CreateAbility, createMongoAbility, ForcedSubject, MongoAbility } from '@casl/ability';
import { User } from './models/user';
import { permissions } from './permissions';

const actions = ['manage', 'invite', 'create', 'delete'] as const
const subjects = ['User', 'Project', 'all'] as const

type AppAbilities = [
    (typeof actions)[number],
    (
        | (typeof subjects)[number]
        | ForcedSubject<Exclude<(typeof subjects)[number], 'all'>>
    ),
]

export type AppAbility = MongoAbility<AppAbilities>
export const createAbility = createMongoAbility as CreateAbility<AppAbility>

export function defineAbilityFor(user: User) {
    const builder = new AbilityBuilder(createAbility)

    if (typeof permissions[user.role] !== 'function') {
        throw new Error(`Permissions for role ${user.role} not found.`)
    }

    permissions[user.role](user, builder)

    const ability = builder.build()

    return ability
}