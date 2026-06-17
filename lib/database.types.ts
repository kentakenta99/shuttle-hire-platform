export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      booking_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          booking_id: string | null
          created_at: string
          event_at: string
          event_id: string
          event_type: string
          idempotency_key: string | null
          payload: Json | null
          server_at: string
          slot_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          booking_id?: string | null
          created_at?: string
          event_at?: string
          event_id?: string
          event_type: string
          idempotency_key?: string | null
          payload?: Json | null
          server_at?: string
          slot_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          booking_id?: string | null
          created_at?: string
          event_at?: string
          event_id?: string
          event_type?: string
          idempotency_key?: string | null
          payload?: Json | null
          server_at?: string
          slot_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booked_by_name: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          created_by: string | null
          flight_number: string
          guest_name: string
          hotel_id: string
          id: string
          luggage_count: number
          notes: string | null
          party_size: number
          signature_url: string | null
          slot_id: string
          status: string
        }
        Insert: {
          booked_by_name?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmation_code: string
          created_at?: string
          created_by?: string | null
          flight_number: string
          guest_name: string
          hotel_id: string
          id?: string
          luggage_count?: number
          notes?: string | null
          party_size: number
          signature_url?: string | null
          slot_id: string
          status?: string
        }
        Update: {
          booked_by_name?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          created_by?: string | null
          flight_number?: string
          guest_name?: string
          hotel_id?: string
          id?: string
          luggage_count?: number
          notes?: string | null
          party_size?: number
          signature_url?: string | null
          slot_id?: string
          status?: string
        }
        Relationships: []
      }
      booknetics_sync_logs: {
        Row: {
          emirates_count: number
          error_message: string | null
          hotels_notified: number
          id: string
          raw_response: Json | null
          slots_cancelled: number
          slots_created: number
          slots_updated: number
          sync_date: string
          synced_at: string
        }
        Insert: {
          emirates_count: number
          error_message?: string | null
          hotels_notified?: number
          id?: string
          raw_response?: Json | null
          slots_cancelled?: number
          slots_created?: number
          slots_updated?: number
          sync_date: string
          synced_at?: string
        }
        Update: {
          emirates_count?: number
          error_message?: string | null
          hotels_notified?: number
          id?: string
          raw_response?: Json | null
          slots_cancelled?: number
          slots_created?: number
          slots_updated?: number
          sync_date?: string
          synced_at?: string
        }
        Relationships: []
      }
      driver_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          driver_id: string | null
          employee_code: string
          id: string
          slot_id: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          driver_id?: string | null
          employee_code: string
          id?: string
          slot_id: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          driver_id?: string | null
          employee_code?: string
          id?: string
          slot_id?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      driver_users: {
        Row: {
          created_at: string
          display_name: string | null
          driver_code: string | null
          employee_code: string
          id: string
          is_active: boolean
          is_emirates_route: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          driver_code?: string | null
          employee_code: string
          id?: string
          is_active?: boolean
          is_emirates_route?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          driver_code?: string | null
          employee_code?: string
          id?: string
          is_active?: boolean
          is_emirates_route?: boolean
          user_id?: string
        }
        Relationships: []
      }
      hotels: {
        Row: {
          auth_user_id: string | null
          billing_email: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          customer_code: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          session_timeout_min: number
          slug: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          session_timeout_min?: number
          slug: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          billing_email?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          session_timeout_min?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_invoices: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          invoice_status: string
          issued_at: string | null
          notes: string | null
          paid_at: string | null
          total_amount_yen: number
          total_bookings: number
          total_seats: number
          year_month: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          invoice_status?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          total_amount_yen?: number
          total_bookings?: number
          total_seats?: number
          year_month: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          invoice_status?: string
          issued_at?: string | null
          notes?: string | null
          paid_at?: string | null
          total_amount_yen?: number
          total_bookings?: number
          total_seats?: number
          year_month?: string
        }
        Relationships: []
      }
      shuttle_slots: {
        Row: {
          capacity: number
          created_at: string
          cutoff_at: string
          date: string
          departure_time: string
          id: string
          notes: string | null
          price_per_seat_yen: number
          remaining_seats: number
          status: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          cutoff_at: string
          date: string
          departure_time: string
          id?: string
          notes?: string | null
          price_per_seat_yen?: number
          remaining_seats: number
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          cutoff_at?: string
          date?: string
          departure_time?: string
          id?: string
          notes?: string | null
          price_per_seat_yen?: number
          remaining_seats?: number
          status?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      tmk_admin_users: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      cancel_booking_by_hotel: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      create_booking: {
        Args: {
          p_slot_id: string
          p_guest_name: string
          p_party_size: number
          p_flight_number: string
          p_luggage_count: number
          p_notes?: string
          p_booked_by_name?: string
        }
        Returns: Json
      }
      current_hotel_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      generate_confirmation_code: { Args: never; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type ShuttleSlot = Tables<'shuttle_slots'>
export type Booking = Tables<'bookings'>
export type Hotel = Tables<'hotels'>
