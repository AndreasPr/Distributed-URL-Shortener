import { headers } from 'next/headers'
import { AuthForm } from '../../components/AuthForm'
export default async function Page() {
  return <AuthForm action="login" nonce={(await headers()).get('x-nonce') || ''} />
}
