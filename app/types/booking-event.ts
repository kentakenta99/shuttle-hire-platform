/**
 * BookingEvent 型定義
 * DBテーブル: booking_events
 * DOS: shifts/{shiftId}/events (ShiftEvent) 相当
 *
 * 設計方針:
 * - 追記専用（immutable）。update / delete は禁止
 * - idempotencyKey で重複登録を防ぐ
 * - DOS ShiftEvent のフィールド名・概念を snake_case で踏襲
 */

/**
 * イベント種別
 * DOS ShiftEventType と対応。シャトル固有イベントは SHUTTLE_ プレフィックス。
 *
 * DOS ShiftEventType との対応:
 *   BOOKING_CREATED      ← JOB_ACCEPTED 相当（シャトル予約確定）
 *   BOOKING_CANCELLED    ← JOB_CANCELLED 相当（乗客都合キャンセル）
 *   BOOKING_COMPLETED    ← JOB_COMPLETED 相当
 *   SHUTTLE_MANIFEST_LOCKED    ← カットオフ後の乗車リスト確定（DOS追加予定: SHUTTLE_MANIFEST_LOCKED）
 *   SHUTTLE_HOTEL_PICKUP_COMPLETED ← 各ホテルでのピックアップ完了（DOS追加予定: SHUTTLE_HOTEL_PICKUP_COMPLETED）
 *   SHUTTLE_QR_SCANNED   ← QRコードスキャン確認（DOS追加予定: SHUTTLE_QR_SCANNED）
 *   SLOT_SUSPENDED       ← TMK都合の運休（bookings.status と別概念）
 *   SLOT_RESUMED         ← 運休解除
 *   DRIVER_ASSIGNED      ← 配車確定
 *   SIGNATURE_CAPTURED   ← 電子署名取得
 */
export type BookingEventType =
  // 予約ライフサイクル（DOS JOB_* 相当）
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_COMPLETED'
  // シャトル固有（DOS SHUTTLE_* として追加予定）
  | 'SHUTTLE_MANIFEST_LOCKED'        // カットオフ到達→乗車リスト確定
  | 'SHUTTLE_HOTEL_PICKUP_COMPLETED' // 各ホテルでのピックアップ完了
  | 'SHUTTLE_QR_SCANNED'             // QRコードスキャン
  // 枠ライフサイクル
  | 'SLOT_SUSPENDED'                 // 運休（TMK都合）
  | 'SLOT_RESUMED'                   // 運休解除
  // 配車
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_UNASSIGNED'
  // その他
  | 'SIGNATURE_CAPTURED'
  | string; // 拡張用

/** 操作者種別（DOS EventActorType と一致） */
export type EventActorType = 'driver' | 'hotel_staff' | 'tmk_admin' | 'system';

/**
 * SHUTTLE_HOTEL_PICKUP_COMPLETED payload
 */
export interface HotelPickupCompletedPayload {
  stop_sequence: number;
  hotel_id: string;
  hotel_name: string;
  actual_boarded_pax_count: number;
  actual_luggage_count: number;
}

/**
 * SHUTTLE_QR_SCANNED payload
 */
export interface QrScannedPayload {
  booking_reference: string;
  hotel_id: string;
  scanned_by_driver_code: string; // DOS employeeCode
}

/**
 * BookingEvent
 * DOS ShiftEvent との対応:
 *   event_id         → eventId
 *   booking_id       → jobId（相当）
 *   slot_id          → shiftId（相当）
 *   event_type       → eventType
 *   event_at         → eventAt
 *   server_at        → serverAt
 *   actor_type       → actorType
 *   actor_id         → actorId
 *   payload          → payload
 *   idempotency_key  → idempotencyKey
 */
export interface BookingEvent {
  event_id: string;
  booking_id: string | null;
  slot_id: string | null;
  event_type: BookingEventType;
  event_at: string;
  server_at: string;
  actor_type: EventActorType;
  actor_id: string | null;
  payload: Record<string, string | number | boolean | null> | null;
  idempotency_key: string | null;
  created_at: string;
}

export type BookingEventInsert = Omit<BookingEvent, 'event_id' | 'server_at' | 'created_at'>;
