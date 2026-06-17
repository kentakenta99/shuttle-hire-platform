import LoginForm from '@/app/components/LoginForm'
import { loginAsAdmin } from '@/app/actions/auth'

export default function AdminLoginPage() {
  return (
    <LoginForm
      action={loginAsAdmin}
      title="TMK管理者 ログイン"
      subtitle="シャトルハイヤー管理システム"
      accentColor="bg-slate-800"
    />
  )
}
