import { headers } from 'next/headers'
import { AuthForm } from '../../components/AuthForm'
export default async function Page() {
  return <AuthForm action="signup" nonce={(await headers()).get('x-nonce') || ''} />
}
