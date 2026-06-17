-- ============================================================
-- Shuttle Hire Platform — Initial Schema
-- v1.3 準拠 (07_shuttle_hire_platform.md)
-- ============================================================

-- ホテルマスター（1ホテル1共有アカウント）
CREATE TABLE hotels (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  name_en             text,
  slug                text UNIQUE NOT NULL,
  pickup_address      text NOT NULL,
  pickup_lat          numeric(10, 7),
  pickup_lng          numeric(10, 7),
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  billing_email       text,
  auth_user_id        uuid REFERENCES auth.users(id),
  session_timeout_min int NOT NULL DEFAULT 60,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- TMK管理者アカウント
CREATE TABLE tmk_admin_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON tmk_admin_users(user_id);

-- ドライバーアカウント（Phase 1: スタンドアロン認証用）
CREATE TABLE driver_users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code     text NOT NULL,
  display_name      text,
  is_emirates_route boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON driver_users(user_id);
CREATE UNIQUE INDEX ON driver_users(employee_code);
CREATE INDEX ON driver_users(is_emirates_route, is_active);

-- 出発枠（在庫管理の核）
CREATE TABLE shuttle_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                date NOT NULL,
  departure_time      time NOT NULL,
  CONSTRAINT valid_departure_window CHECK (
    departure_time >= '11:00:00' AND departure_time <= '15:00:00'
  ),
  capacity            int NOT NULL CHECK (capacity > 0),
  remaining_seats     int NOT NULL CHECK (remaining_seats >= 0),
  vehicle_type        text NOT NULL DEFAULT 'standard',
  price_per_seat_yen  int NOT NULL DEFAULT 13500,
  cutoff_at           timestamptz NOT NULL,
  -- suspended = TMK都合による運休。乗客キャンセル(bookings.cancelled)とは別概念
  status              text NOT NULL DEFAULT 'open',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_capacity CHECK (remaining_seats <= capacity),
  CONSTRAINT valid_status CHECK (status IN ('open','full','closed','suspended'))
);
CREATE INDEX ON shuttle_slots(date, status);

-- 予約
CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code text UNIQUE NOT NULL,
  slot_id           uuid NOT NULL REFERENCES shuttle_slots(id),
  hotel_id          uuid NOT NULL REFERENCES hotels(id),
  guest_name        text NOT NULL,
  party_size        int NOT NULL CHECK (party_size > 0),
  flight_number     text NOT NULL,
  luggage_count     int NOT NULL DEFAULT 0 CHECK (luggage_count >= 0),
  notes             text,
  booked_by_name    text,             -- 予約したベルボーイ・スタッフ名（任意。1ホテル1アカウント環境での個人識別用）
  signature_url     text,
  -- cancelled = 乗客都合のキャンセル（Service Order: cancelled に対応）
  status            text NOT NULL DEFAULT 'confirmed',
  cancelled_reason  text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  cancelled_at      timestamptz,
  completed_at      timestamptz,
  CONSTRAINT valid_booking_status CHECK (status IN ('confirmed','cancelled','completed'))
);
CREATE INDEX ON bookings(slot_id, status);
CREATE INDEX ON bookings(hotel_id, created_at DESC);

-- ドライバーアサイン
CREATE TABLE driver_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       uuid NOT NULL REFERENCES shuttle_slots(id),
  driver_id     uuid REFERENCES auth.users(id),
  employee_code text NOT NULL,
  vehicle_id    text,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  assigned_by   uuid REFERENCES auth.users(id),
  UNIQUE(slot_id)
);
CREATE INDEX ON driver_assignments(employee_code);

-- 月次請求サマリー
CREATE TABLE monthly_invoices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES hotels(id),
  year_month       char(7) NOT NULL,
  total_bookings   int NOT NULL DEFAULT 0,
  total_seats      int NOT NULL DEFAULT 0,
  total_amount_yen int NOT NULL DEFAULT 0,
  invoice_status   text NOT NULL DEFAULT 'pending',
  issued_at        timestamptz,
  paid_at          timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, year_month)
);

-- Booknetics同期ログ（Phase 4用）
CREATE TABLE booknetics_sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date       date NOT NULL UNIQUE,
  emirates_count  int NOT NULL,
  slots_created   int NOT NULL DEFAULT 0,
  slots_updated   int NOT NULL DEFAULT 0,
  slots_cancelled int NOT NULL DEFAULT 0,
  hotels_notified int NOT NULL DEFAULT 0,
  raw_response    jsonb,
  error_message   text,
  synced_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 確認番号生成関数
-- ============================================================
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS text AS $$
DECLARE
  ym text := to_char(now(), 'YYYYMM');
  seq_name text := 'booking_seq_' || ym;
  seq_val int;
BEGIN
  BEGIN
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', seq_name);
  EXCEPTION WHEN duplicate_table THEN NULL;
  END;
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO seq_val;
  RETURN 'TMK-' || ym || '-' || lpad(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
