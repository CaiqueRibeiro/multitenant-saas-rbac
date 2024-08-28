import { defineAbilityFor } from '@saas/auth';

const ability = defineAbilityFor({ role: 'ADMIN' })

const userCanInviteSomeoneElse = ability.can('invite', 'User')
const userCanDeleteUser = ability.can('delete', 'User')

console.log(userCanInviteSomeoneElse)
console.log(userCanDeleteUser)