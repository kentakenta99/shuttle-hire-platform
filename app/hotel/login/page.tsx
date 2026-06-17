import LoginForm from '@/app/components/LoginForm'
import { loginAsHotelStaff } from '@/app/actions/auth'

export default function HotelLoginPage() {
  return (
    <LoginForm
      action={loginAsHotelStaff}
      title="ホテルスタッフ ログイン"
      subtitle="シャトルハイヤー空き枠確認・予約"
      accentColor="bg-blue-600"
    />
  )
}
