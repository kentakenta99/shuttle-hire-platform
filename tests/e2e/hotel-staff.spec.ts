import { test, expect, request as playwrightRequest } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const EMAIL    = process.env.E2E_HOTEL_EMAIL    ?? 'kenta_yagi@wishbone.tokyo'
const PASSWORD = process.env.E2E_HOTEL_PASSWORD ?? ''
// E2Eテスト専用スロット（2099年・capacity=50・枯渇しない）
const SLOT_ID  = process.env.E2E_TEST_SLOT_ID   ?? '74a17bc2-f0cd-493b-80eb-87b8cf4a1311'

// テスト終了後にE2Eテスト予約を全てキャンセルしてスロットをリセット
test.afterAll(async () => {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const supabase = createClient(url, key)
  await supabase
    .from('service_orders')
    .update({ status: 'cancelled' })
    .eq('slot_id', SLOT_ID)
    .eq('status', 'confirmed')
    .like('guest_name', 'E2E%')
  // remaining_seats を再計算
  const { count } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', SLOT_ID)
    .eq('status', 'confirmed')
  const { data: slot } = await supabase
    .from('shuttle_slots')
    .select('capacity')
    .eq('id', SLOT_ID)
    .single()
  if (slot) {
    await supabase
      .from('shuttle_slots')
      .update({ remaining_seats: slot.capacity - (count ?? 0), status: 'open' })
      .eq('id', SLOT_ID)
  }
})

// ログイン済みセッションを再利用する（各テストで毎回ログインしない）
test.describe('ホテルスタッフ — 事前ログイン', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hotel/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await page.waitForURL('**/hotel/calendar', { timeout: 15000 })
  })

  test('T03 リロードしてもセッションが維持される', async ({ page }) => {
    await page.reload()
    await expect(page).toHaveURL(/\/hotel\/calendar/)
    // ログインページに飛ばされていないことを確認
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('T04 カレンダーにスロット一覧が表示される', async ({ page }) => {
    // スロット（便名 or 時刻）が1件以上表示される
    await expect(page.locator('main').first()).toBeVisible()
    const slotCount = await page.locator('[href*="/hotel/book/"]').count()
    expect(slotCount).toBeGreaterThan(0)
  })

  test('T05 予約フォーム表示 — 必須フィールドが揃っている', async ({ page }) => {
    await page.goto(`/hotel/book/${SLOT_ID}`)
    await expect(page.locator('input[name="guestName"]')).toBeVisible()
    await expect(page.locator('input[name="flightNumber"]')).toBeVisible()
    await expect(page.locator('select[name="luggageCount"]')).toBeVisible()
    await expect(page.locator('input[name="bookedByName"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '予約を確定する' })).toBeVisible()
  })

  test('T06 予約作成 → 確認番号が発行される', async ({ page }) => {
    await page.goto(`/hotel/book/${SLOT_ID}`)

    await page.fill('input[name="guestName"]', 'E2E テスト / E2E TEST')
    await page.fill('input[name="flightNumber"]', 'NH801')
    await page.selectOption('select[name="luggageCount"]', '1')
    await page.fill('input[name="bookedByName"]', 'E2Eテスト担当')

    await page.getByRole('button', { name: '予約を確定する' }).click()

    // 完了ページへリダイレクト
    await page.waitForURL('**/hotel/bookings/**', { timeout: 20000 })

    // TMK- 確認番号が画面に表示される
    const ref = page.locator('text=TMK-')
    await expect(ref.first()).toBeVisible({ timeout: 10000 })
  })

  test('T07 予約履歴ページが表示される', async ({ page }) => {
    await page.goto('/hotel/bookings')
    await expect(page).toHaveURL(/\/hotel\/bookings/)
    // TMK- または「予約がありません」のいずれかが表示される
    const hasBookings = await page.locator('text=TMK-').count()
    const isEmpty     = await page.locator('text=予約').count()
    expect(hasBookings + isEmpty).toBeGreaterThan(0)
  })

  test('T08 直近予約をキャンセルできる', async ({ page }) => {
    // まず予約を1件作成する
    await page.goto(`/hotel/book/${SLOT_ID}`)
    await page.fill('input[name="guestName"]', 'E2E キャンセルテスト')
    await page.fill('input[name="flightNumber"]', 'NH801')
    await page.selectOption('select[name="luggageCount"]', '0')
    await page.fill('input[name="bookedByName"]', 'E2E自動')
    await page.getByRole('button', { name: '予約を確定する' }).click()
    await page.waitForURL('**/hotel/bookings/**', { timeout: 20000 })

    // キャンセルボタンをクリック
    const cancelBtn = page.locator('text=この予約をキャンセルする')
    await expect(cancelBtn).toBeVisible({ timeout: 10000 })
    await cancelBtn.click()

    // 確認ダイアログ → 実行
    const confirmBtn = page.locator('text=はい、キャンセルする')
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()

    // キャンセル完了後のページを待つ
    await expect(
      page.getByText('このご予約はキャンセルされています')
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('ホテルスタッフ — 未ログイン保護', () => {
  test('T01 未ログインで /hotel/calendar にアクセス → ログインページへ', async ({ page }) => {
    await page.goto('/hotel/calendar')
    await expect(page).toHaveURL(/\/hotel\/login/)
  })

  test('T02 ログイン失敗 — 誤パスワード', async ({ page }) => {
    await page.goto('/hotel/login')
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません')
    ).toBeVisible({ timeout: 10000 })
  })
})
