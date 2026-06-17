import LoginForm from '@/app/components/LoginForm'
import { loginAsDriver } from '@/app/actions/auth'

export default function DriverLoginPage() {
  return (
    <LoginForm
      action={loginAsDriver}
      title="乗務員 ログイン"
      subtitle="本日の担当便・乗客確認"
      accentColor="bg-emerald-600"
    />
  )
}
