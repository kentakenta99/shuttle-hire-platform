export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_events: {
        Row: {
          created_at: string
          email: string
          event_type: string
          id: string
          ip_address: string | null
          role: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_type: string
          id?: string
          ip_address?: string | null
          role: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          role?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "shuttle_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          converted_booking_id: string | null
          created_at: string
          flight_number: string
          guest_email: string | null
          guest_name: string
          hotel_id: string
          id: string
          ip_address: string | null
          luggage_count: number
          notes: string | null
          party_size: number
          preferred_date: string
          preferred_time: string
          room_number: string
          status: string
        }
        Insert: {
          converted_booking_id?: string | null
          created_at?: string
          flight_number: string
          guest_email?: string | null
          guest_name: string
          hotel_id: string
          id?: string
          ip_address?: string | null
          luggage_count?: number
          notes?: string | null
          party_size: number
          preferred_date: string
          preferred_time: string
          room_number: string
          status?: string
        }
        Update: {
          converted_booking_id?: string | null
          created_at?: string
          flight_number?: string
          guest_email?: string | null
          guest_name?: string
          hotel_id?: string
          id?: string
          ip_address?: string | null
          luggage_count?: number
          notes?: string | null
          party_size?: number
          preferred_date?: string
          preferred_time?: string
          room_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_converted_booking_id_fkey"
            columns: ["converted_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booked_by_name: string | null
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_reason: string | null
          completed_at: string | null
          confirmation_code: string
          created_at: string
          created_by: string | null
          flight_number: string
          guest_email: string | null
          guest_name: string
          hotel_id: string
          id: string
          luggage_count: number
          notes: string | null
          original_unit_price: number | null
          party_size: number
          signature_url: string | null
          slot_id: string
          status: string
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          booked_by_name?: string | null
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmation_code: string
          created_at?: string
          created_by?: string | null
          flight_number: string
          guest_email?: string | null
          guest_name: string
          hotel_id: string
          id?: string
          luggage_count?: number
          notes?: string | null
          original_unit_price?: number | null
          party_size: number
          signature_url?: string | null
          slot_id: string
          status?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          booked_by_name?: string | null
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          created_by?: string | null
          flight_number?: string
          guest_email?: string | null
          guest_name?: string
          hotel_id?: string
          id?: string
          luggage_count?: number
          notes?: string | null
          original_unit_price?: number | null
          party_size?: number
          signature_url?: string | null
          slot_id?: string
          status?: string
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "shuttle_slots"
            referencedColumns: ["id"]
          },
        ]
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
      cancellation_policies: {
        Row: {
          fee_pct: number
          id: string
          note: string | null
          threshold_hours: number
          updated_at: string
          updated_by_name: string | null
        }
        Insert: {
          fee_pct?: number
          id?: string
          note?: string | null
          threshold_hours?: number
          updated_at?: string
          updated_by_name?: string | null
        }
        Update: {
          fee_pct?: number
          id?: string
          note?: string | null
          threshold_hours?: number
          updated_at?: string
          updated_by_name?: string | null
        }
        Relationships: []
      }
      driver_assignment_logs: {
        Row: {
          action: string
          created_at: string
          driver_id: string | null
          driver_name: string | null
          employee_code: string
          id: string
          performed_by: string | null
          performed_by_name: string | null
          slot_id: string
        }
        Insert: {
          action: string
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          employee_code: string
          id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          slot_id: string
        }
        Update: {
          action?: string
          created_at?: string
          driver_id?: string | null
          driver_name?: string | null
          employee_code?: string
          id?: string
          performed_by?: string | null
          performed_by_name?: string | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignment_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignment_logs_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "shuttle_slots"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "shuttle_slots"
            referencedColumns: ["id"]
          },
        ]
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
          is_shuttle_eligible: boolean
          shuttle_score: number
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
          is_shuttle_eligible?: boolean
          shuttle_score?: number
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
          is_shuttle_eligible?: boolean
          shuttle_score?: number
          user_id?: string
        }
        Relationships: []
      }
      hotel_pricing_tiers: {
        Row: {
          hotel_id: string
          id: string
          party_size: number
          per_person_price: number
        }
        Insert: {
          hotel_id: string
          id?: string
          party_size: number
          per_person_price: number
        }
        Update: {
          hotel_id?: string
          id?: string
          party_size?: number
          per_person_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_pricing_tiers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          auth_user_id: string | null
          billing_email: string | null
          billing_type: string
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
          billing_type?: string
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
          billing_type?: string
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
        Relationships: [
          {
            foreignKeyName: "monthly_invoices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_slots: {
        Row: {
          arrived_at: string | null
          capacity: number
          created_at: string
          cutoff_at: string
          date: string
          departed_at: string | null
          departure_time: string
          id: string
          notes: string | null
          price_per_seat_yen: number
          remaining_seats: number
          status: string
          updated_at: string
          vehicle_plate: string | null
          vehicle_type: string
        }
        Insert: {
          arrived_at?: string | null
          capacity: number
          created_at?: string
          cutoff_at: string
          date: string
          departed_at?: string | null
          departure_time: string
          id?: string
          notes?: string | null
          price_per_seat_yen?: number
          remaining_seats: number
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_type?: string
        }
        Update: {
          arrived_at?: string | null
          capacity?: number
          created_at?: string
          cutoff_at?: string
          date?: string
          departed_at?: string | null
          departure_time?: string
          id?: string
          notes?: string | null
          price_per_seat_yen?: number
          remaining_seats?: number
          status?: string
          updated_at?: string
          vehicle_plate?: string | null
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
          is_super_admin: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_super_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_booking_by_hotel:
        | {
            Args: {
              p_booking_id: string
              p_hotel_id?: string
              p_reason?: string
            }
            Returns: Json
          }
        | { Args: { p_booking_id: string; p_reason?: string }; Returns: Json }
      create_booking:
        | {
            Args: {
              p_booked_by_name?: string
              p_flight_number: string
              p_guest_name: string
              p_luggage_count: number
              p_notes?: string
              p_party_size: number
              p_slot_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_booked_by_name?: string
              p_flight_number: string
              p_guest_name: string
              p_hotel_id: string
              p_luggage_count: number
              p_notes?: string
              p_party_size: number
              p_slot_id: string
            }
            Returns: Json
          }
      current_hotel_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      generate_confirmation_code: { Args: never; Returns: string }
      recalculate_slot_pricing: {
        Args: { p_hotel_id: string; p_slot_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// 便利型エイリアス
export type ShuttleSlot = Database['public']['Tables']['shuttle_slots']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type CancellationPolicy = Database['public']['Tables']['cancellation_policies']['Row']
