-- bookings.status に 'arrived'（空港到着済）を追加
ALTER TABLE bookings DROP CONSTRAINT valid_booking_status;
ALTER TABLE bookings ADD CONSTRAINT valid_booking_status
  CHECK (status = ANY (ARRAY['confirmed'::text, 'cancelled'::text, 'completed'::text, 'arrived'::text]));
