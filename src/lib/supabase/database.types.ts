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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      academies: {
        Row: {
          address: string | null
          birthday_wish_enabled: boolean
          court_membership_enabled: boolean
          created_at: string
          fee_ack_enabled: boolean
          fee_reminder_enabled: boolean
          id: string
          logo_url: string | null
          multi_branch_enabled: boolean
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birthday_wish_enabled?: boolean
          court_membership_enabled?: boolean
          created_at?: string
          fee_ack_enabled?: boolean
          fee_reminder_enabled?: boolean
          id?: string
          logo_url?: string | null
          multi_branch_enabled?: boolean
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birthday_wish_enabled?: boolean
          court_membership_enabled?: boolean
          created_at?: string
          fee_ack_enabled?: boolean
          fee_reminder_enabled?: boolean
          id?: string
          logo_url?: string | null
          multi_branch_enabled?: boolean
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      account_entries: {
        Row: {
          academy_id: string
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          entry_type: Database["public"]["Enums"]["account_entry_type"]
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          updated_at: string
        }
        Insert: {
          academy_id: string
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          entry_type: Database["public"]["Enums"]["account_entry_type"]
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
        }
        Update: {
          academy_id?: string
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          entry_type?: Database["public"]["Enums"]["account_entry_type"]
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_entries_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          academy_id: string
          batch_id: string
          created_at: string
          date: string
          id: string
          records: Json
          updated_at: string
        }
        Insert: {
          academy_id: string
          batch_id: string
          created_at?: string
          date: string
          id?: string
          records?: Json
          updated_at?: string
        }
        Update: {
          academy_id?: string
          batch_id?: string
          created_at?: string
          date?: string
          id?: string
          records?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          academy_id: string
          branch_id: string | null
          created_at: string
          days: Database["public"]["Enums"]["day_of_week"][]
          description: string | null
          fees: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          branch_id?: string | null
          created_at?: string
          days?: Database["public"]["Enums"]["day_of_week"][]
          description?: string | null
          fees?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          branch_id?: string | null
          created_at?: string
          days?: Database["public"]["Enums"]["day_of_week"][]
          description?: string | null
          fees?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          academy_id: string
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          name: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      court_check_ins: {
        Row: {
          academy_id: string
          checked_in_at: string
          created_at: string
          id: string
          membership_id: string
          people_checked_in: number
          sessions_after: number | null
        }
        Insert: {
          academy_id: string
          checked_in_at?: string
          created_at?: string
          id?: string
          membership_id: string
          people_checked_in?: number
          sessions_after?: number | null
        }
        Update: {
          academy_id?: string
          checked_in_at?: string
          created_at?: string
          id?: string
          membership_id?: string
          people_checked_in?: number
          sessions_after?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "court_check_ins_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_check_ins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "court_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      court_membership_people: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          membership_id: string
          name: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          membership_id: string
          name: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_membership_people_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_membership_people_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "court_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      court_memberships: {
        Row: {
          academy_id: string
          address: string | null
          amount_paid: number
          contact_name: string
          contact_phone: string
          created_at: string
          email: string | null
          end_date: string
          id: string
          notes: string | null
          pending_amount: number
          people_count: number
          plan_id: string | null
          plan_type: Database["public"]["Enums"]["court_plan_type"]
          remaining_sessions: number | null
          start_date: string
          status: Database["public"]["Enums"]["court_membership_status"]
          total_sessions: number | null
          updated_at: string
        }
        Insert: {
          academy_id: string
          address?: string | null
          amount_paid?: number
          contact_name: string
          contact_phone: string
          created_at?: string
          email?: string | null
          end_date: string
          id?: string
          notes?: string | null
          pending_amount?: number
          people_count?: number
          plan_id?: string | null
          plan_type: Database["public"]["Enums"]["court_plan_type"]
          remaining_sessions?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["court_membership_status"]
          total_sessions?: number | null
          updated_at?: string
        }
        Update: {
          academy_id?: string
          address?: string | null
          amount_paid?: number
          contact_name?: string
          contact_phone?: string
          created_at?: string
          email?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          pending_amount?: number
          people_count?: number
          plan_id?: string | null
          plan_type?: Database["public"]["Enums"]["court_plan_type"]
          remaining_sessions?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["court_membership_status"]
          total_sessions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_memberships_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "court_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      court_payment_entries: {
        Row: {
          academy_id: string
          amount: number
          created_at: string
          date: string
          entry_type: Database["public"]["Enums"]["court_payment_entry_type"]
          id: string
          membership_id: string
          note: string | null
          partial_due: number | null
          paying_now: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sessions_added: number | null
          status: Database["public"]["Enums"]["court_payment_entry_status"]
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          date: string
          entry_type: Database["public"]["Enums"]["court_payment_entry_type"]
          id?: string
          membership_id: string
          note?: string | null
          partial_due?: number | null
          paying_now?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sessions_added?: number | null
          status?: Database["public"]["Enums"]["court_payment_entry_status"]
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          date?: string
          entry_type?: Database["public"]["Enums"]["court_payment_entry_type"]
          id?: string
          membership_id?: string
          note?: string | null
          partial_due?: number | null
          paying_now?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sessions_added?: number | null
          status?: Database["public"]["Enums"]["court_payment_entry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "court_payment_entries_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_payment_entries_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "court_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      court_plans: {
        Row: {
          academy_id: string
          created_at: string
          duration_months: number | null
          id: string
          is_active: boolean
          name: string
          plan_type: Database["public"]["Enums"]["court_plan_type"]
          price: number
          total_sessions: number | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          academy_id: string
          created_at?: string
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name: string
          plan_type: Database["public"]["Enums"]["court_plan_type"]
          price: number
          total_sessions?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          academy_id?: string
          created_at?: string
          duration_months?: number | null
          id?: string
          is_active?: boolean
          name?: string
          plan_type?: Database["public"]["Enums"]["court_plan_type"]
          price?: number
          total_sessions?: number | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "court_plans_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          academy_id: string
          created_at: string
          guardian_name: string
          id: string
          name: string
          notes: string | null
          phone: string
          status: Database["public"]["Enums"]["enquiry_status"]
          trial_date: string | null
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          guardian_name: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          trial_date?: string | null
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          guardian_name?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          trial_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          academy_id: string
          created_at: string
          date: string
          description: string | null
          event_type: Database["public"]["Enums"]["event_category"]
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          date: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_category"]
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          date?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_category"]
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          academy_id: string
          category: string
          created_at: string
          description: string
          icon: string | null
          id: string
          name: string
          price: number
          quantity: number
          selling_price: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          category: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          name: string
          price: number
          quantity?: number
          selling_price: number
          sku: string
          unit: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          name?: string
          price?: number
          quantity?: number
          selling_price?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_types: {
        Row: {
          academy_id: string
          created_at: string
          duration: number
          duration_type: Database["public"]["Enums"]["duration_type"]
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          academy_id: string
          created_at?: string
          duration: number
          duration_type?: Database["public"]["Enums"]["duration_type"]
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          academy_id?: string
          created_at?: string
          duration?: number
          duration_type?: Database["public"]["Enums"]["duration_type"]
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_types_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          academy_id: string
          created_at: string
          id: string
          recipient_count: number
          sent_at: string
          status: Database["public"]["Enums"]["message_log_status"]
          template_id: string
          trigger_type: Database["public"]["Enums"]["message_trigger_type"]
        }
        Insert: {
          academy_id: string
          created_at?: string
          id?: string
          recipient_count?: number
          sent_at?: string
          status?: Database["public"]["Enums"]["message_log_status"]
          template_id: string
          trigger_type?: Database["public"]["Enums"]["message_trigger_type"]
        }
        Update: {
          academy_id?: string
          created_at?: string
          id?: string
          recipient_count?: number
          sent_at?: string
          status?: Database["public"]["Enums"]["message_log_status"]
          template_id?: string
          trigger_type?: Database["public"]["Enums"]["message_trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          academy_id: string
          branch_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["staff_role"]
          status: Database["public"]["Enums"]["staff_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          academy_id: string
          branch_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          academy_id?: string
          branch_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      student_payments: {
        Row: {
          academy_id: string
          amount: number
          created_at: string
          date: string
          id: string
          months_covered: number
          note: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          remaining_amount: number
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          academy_id: string
          amount: number
          created_at?: string
          date: string
          id?: string
          months_covered?: number
          note?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          remaining_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          academy_id?: string
          amount?: number
          created_at?: string
          date?: string
          id?: string
          months_covered?: number
          note?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          remaining_amount?: number
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_payments_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academy_id: string
          alternate_phone: string | null
          batch_id: string | null
          created_at: string
          date_of_birth: string | null
          dropout_date: string | null
          dropout_reason: string | null
          enrollment_source:
            | Database["public"]["Enums"]["enrollment_source"]
            | null
          fees: number
          guardian_name: string | null
          id: string
          internal_notes: string
          membership_start_date: string
          membership_type_id: string
          name: string
          next_due_date: string
          pending_amount: number
          phone: string
          start_date: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          academy_id: string
          alternate_phone?: string | null
          batch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dropout_date?: string | null
          dropout_reason?: string | null
          enrollment_source?:
            | Database["public"]["Enums"]["enrollment_source"]
            | null
          fees: number
          guardian_name?: string | null
          id?: string
          internal_notes?: string
          membership_start_date: string
          membership_type_id: string
          name: string
          next_due_date: string
          pending_amount?: number
          phone: string
          start_date: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          academy_id?: string
          alternate_phone?: string | null
          batch_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          dropout_date?: string | null
          dropout_reason?: string | null
          enrollment_source?:
            | Database["public"]["Enums"]["enrollment_source"]
            | null
          fees?: number
          guardian_name?: string | null
          id?: string
          internal_notes?: string
          membership_start_date?: string
          membership_type_id?: string
          name?: string
          next_due_date?: string
          pending_amount?: number
          phone?: string
          start_date?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_academy_id_fkey"
            columns: ["academy_id"]
            isOneToOne: false
            referencedRelation: "academies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_membership_type_id_fkey"
            columns: ["membership_type_id"]
            isOneToOne: false
            referencedRelation: "membership_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_staff_invitation: { Args: never; Returns: undefined }
      get_my_academy_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
    }
    Enums: {
      account_entry_type: "expense" | "income"
      attendance_status: "present" | "absent"
      court_membership_status:
        | "active"
        | "due_soon"
        | "expired"
        | "sessions_low"
        | "exhausted"
        | "inactive"
        | "dropout"
      court_payment_entry_status: "active" | "deleted"
      court_payment_entry_type: "new" | "renewal" | "session_topup"
      court_plan_type: "monthly" | "sessions"
      day_of_week:
        | "Monday"
        | "Tuesday"
        | "Wednesday"
        | "Thursday"
        | "Friday"
        | "Saturday"
        | "Sunday"
      duration_type: "months" | "days"
      enquiry_status: "not_scheduled" | "scheduled" | "completed"
      enrollment_source: "walk-in" | "referral" | "social-media" | "other"
      event_category:
        | "tournament"
        | "sports-meet"
        | "maintenance"
        | "holiday"
        | "other"
      message_log_status: "sent" | "delivered" | "read" | "failed"
      message_trigger_type: "manual" | "auto"
      payment_method: "cash" | "upi" | "card" | "other"
      payment_status: "active" | "inactive" | "deleted"
      payment_type: "full" | "partial" | "advance"
      staff_role: "owner" | "manager" | "coach" | "accountant" | "receptionist"
      staff_status: "active" | "invited" | "suspended"
      student_status: "active" | "due-soon" | "expired" | "inactive" | "dropout"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_entry_type: ["expense", "income"],
      attendance_status: ["present", "absent"],
      court_membership_status: [
        "active",
        "due_soon",
        "expired",
        "sessions_low",
        "exhausted",
        "inactive",
        "dropout",
      ],
      court_payment_entry_status: ["active", "deleted"],
      court_payment_entry_type: ["new", "renewal", "session_topup"],
      court_plan_type: ["monthly", "sessions"],
      day_of_week: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      duration_type: ["months", "days"],
      enquiry_status: ["not_scheduled", "scheduled", "completed"],
      enrollment_source: ["walk-in", "referral", "social-media", "other"],
      event_category: [
        "tournament",
        "sports-meet",
        "maintenance",
        "holiday",
        "other",
      ],
      message_log_status: ["sent", "delivered", "read", "failed"],
      message_trigger_type: ["manual", "auto"],
      payment_method: ["cash", "upi", "card", "other"],
      payment_status: ["active", "inactive", "deleted"],
      payment_type: ["full", "partial", "advance"],
      staff_role: ["owner", "manager", "coach", "accountant", "receptionist"],
      staff_status: ["active", "invited", "suspended"],
      student_status: ["active", "due-soon", "expired", "inactive", "dropout"],
    },
  },
} as const
