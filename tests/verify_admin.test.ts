import { test } from 'node:test'
import assert from 'node:assert'
import PocketBase from 'pocketbase'

const PB_URL = process.env.VITE_POCKETBASE_URL || 'https://integracao-de-ferramentas-do-consultor-e38b8.shrd00.internal.goskip.dev'
const SUPERUSER_TOKEN = process.env.PB_SUPERUSER_TOKEN

test('test superuser token and examine user record', async () => {
  console.log('PB_URL:', PB_URL)
  console.log('SUPERUSER_TOKEN exists:', Boolean(SUPERUSER_TOKEN))

  if (!SUPERUSER_TOKEN) {
    console.log('No SUPERUSER_TOKEN found in process.env')
    return
  }

  const pb = new PocketBase(PB_URL)
  pb.authStore.save(SUPERUSER_TOKEN, null)

  const user = await pb.collection('users').getOne('uqhdzem2zn9abxc')
  console.log('User found via superuser auth:', user.id, user.email, user.name, user.updated)
  assert.strictEqual(user.id, 'uqhdzem2zn9abxc')
  assert.strictEqual(user.email, 'jardel.messias.dev@gmail.com')
})
