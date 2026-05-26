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
      agency_client_activity_log: {
        Row: {
          action_text: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_text: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_text?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_client_events: {
        Row: {
          client_id: string
          created_at: string
          event_date_ad: string | null
          event_date_bs: string | null
          event_name: string | null
          id: string
          required_crew: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          event_date_ad?: string | null
          event_date_bs?: string | null
          event_name?: string | null
          id?: string
          required_crew?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          event_date_ad?: string | null
          event_date_bs?: string | null
          event_name?: string | null
          id?: string
          required_crew?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agency_client_family_members: {
        Row: {
          client_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          pending: boolean
          photo_url: string | null
          role: string
          side: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          pending?: boolean
          photo_url?: string | null
          role: string
          side: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          pending?: boolean
          photo_url?: string | null
          role?: string
          side?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_client_payments: {
        Row: {
          amount: number
          bank_id: string | null
          client_id: string
          created_at: string
          id: string
          is_opening_balance: boolean
          note: string | null
          payment_date: string
          payment_date_bs: string | null
          payment_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_opening_balance?: boolean
          note?: string | null
          payment_date?: string
          payment_date_bs?: string | null
          payment_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_opening_balance?: boolean
          note?: string | null
          payment_date?: string
          payment_date_bs?: string | null
          payment_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_payments_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "agency_finance_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_clients: {
        Row: {
          advance_amount: number
          client_name: string
          client_slug: string | null
          contact_number: string | null
          couple_photo_url: string | null
          created_at: string
          description: string | null
          email: string | null
          event_area: string | null
          event_city: string | null
          event_date_ad: string | null
          event_date_bs: string | null
          event_from_city: string | null
          event_location_type: string | null
          event_name: string | null
          event_to_city: string | null
          handler: string | null
          id: string
          notes: string | null
          package_amount: number
          portal_enabled: boolean
          portal_token: string | null
          profile_photo_url: string | null
          rating: number | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          advance_amount?: number
          client_name: string
          client_slug?: string | null
          contact_number?: string | null
          couple_photo_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          event_area?: string | null
          event_city?: string | null
          event_date_ad?: string | null
          event_date_bs?: string | null
          event_from_city?: string | null
          event_location_type?: string | null
          event_name?: string | null
          event_to_city?: string | null
          handler?: string | null
          id?: string
          notes?: string | null
          package_amount?: number
          portal_enabled?: boolean
          portal_token?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          advance_amount?: number
          client_name?: string
          client_slug?: string | null
          contact_number?: string | null
          couple_photo_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          event_area?: string | null
          event_city?: string | null
          event_date_ad?: string | null
          event_date_bs?: string | null
          event_from_city?: string | null
          event_location_type?: string | null
          event_name?: string | null
          event_to_city?: string | null
          handler?: string | null
          id?: string
          notes?: string | null
          package_amount?: number
          portal_enabled?: boolean
          portal_token?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      agency_finance_banks: {
        Row: {
          account_holder_name: string
          bank_name: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name: string
          bank_name: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string
          bank_name?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_finance_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_finance_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_reference_share_tokens: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_reference_share_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          created_at: string
          handlers: string[]
          id: string
          sources: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handlers?: string[]
          id?: string
          sources?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          handlers?: string[]
          id?: string
          sources?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agency_staff_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          agency_user_id: string
          created_at: string
          id: string
          payload: Json | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          agency_user_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          agency_user_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      agency_staff_invitations: {
        Row: {
          agency_user_id: string
          created_at: string
          gadget: string | null
          id: string
          invited_user_id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_user_id: string
          created_at?: string
          gadget?: string | null
          id?: string
          invited_user_id: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          agency_user_id?: string
          created_at?: string
          gadget?: string | null
          id?: string
          invited_user_id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_staff_roles: {
        Row: {
          agency_user_id: string
          granted_at: string
          granted_by: string | null
          id: string
          role: string
          staff_user_id: string
        }
        Insert: {
          agency_user_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: string
          staff_user_id: string
        }
        Update: {
          agency_user_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          staff_user_id?: string
        }
        Relationships: []
      }
      album_selection_submissions: {
        Row: {
          album_details: Json
          bride_name: string | null
          client_id: string
          created_at: string
          custom_text: string | null
          groom_name: string | null
          handled: boolean
          handled_response: string | null
          id: string
          selected_date: string | null
        }
        Insert: {
          album_details?: Json
          bride_name?: string | null
          client_id: string
          created_at?: string
          custom_text?: string | null
          groom_name?: string | null
          handled?: boolean
          handled_response?: string | null
          id?: string
          selected_date?: string | null
        }
        Update: {
          album_details?: Json
          bride_name?: string | null
          client_id?: string
          created_at?: string
          custom_text?: string | null
          groom_name?: string | null
          handled?: boolean
          handled_response?: string | null
          id?: string
          selected_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_selection_submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      album_types: {
        Row: {
          created_at: string
          id: string
          type_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          type_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          type_name?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_details: {
        Row: {
          booking_id: string
          bride_contact: string | null
          bride_full_name: string | null
          bride_home_area: string | null
          bride_home_city: string | null
          bride_instagram: string | null
          bride_whatsapp: string | null
          created_at: string
          event_end_time: string | null
          event_name: string | null
          event_owner_name: string | null
          event_owner_user_id: string | null
          event_owner_whatsapp: string | null
          event_start_time: string | null
          form_token: string | null
          groom_contact: string | null
          groom_full_name: string | null
          groom_home_area: string | null
          groom_home_city: string | null
          groom_instagram: string | null
          groom_whatsapp: string | null
          id: string
          is_own_event: boolean
          role_category: string | null
          sub_role: string | null
          updated_at: string
          user_id: string
          venue_area: string | null
          venue_city: string | null
          venue_map: string | null
          venue_name: string | null
          venue_type: string | null
        }
        Insert: {
          booking_id: string
          bride_contact?: string | null
          bride_full_name?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_instagram?: string | null
          bride_whatsapp?: string | null
          created_at?: string
          event_end_time?: string | null
          event_name?: string | null
          event_owner_name?: string | null
          event_owner_user_id?: string | null
          event_owner_whatsapp?: string | null
          event_start_time?: string | null
          form_token?: string | null
          groom_contact?: string | null
          groom_full_name?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_instagram?: string | null
          groom_whatsapp?: string | null
          id?: string
          is_own_event?: boolean
          role_category?: string | null
          sub_role?: string | null
          updated_at?: string
          user_id: string
          venue_area?: string | null
          venue_city?: string | null
          venue_map?: string | null
          venue_name?: string | null
          venue_type?: string | null
        }
        Update: {
          booking_id?: string
          bride_contact?: string | null
          bride_full_name?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_instagram?: string | null
          bride_whatsapp?: string | null
          created_at?: string
          event_end_time?: string | null
          event_name?: string | null
          event_owner_name?: string | null
          event_owner_user_id?: string | null
          event_owner_whatsapp?: string | null
          event_start_time?: string | null
          form_token?: string | null
          groom_contact?: string | null
          groom_full_name?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_instagram?: string | null
          groom_whatsapp?: string | null
          id?: string
          is_own_event?: boolean
          role_category?: string | null
          sub_role?: string | null
          updated_at?: string
          user_id?: string
          venue_area?: string | null
          venue_city?: string | null
          venue_map?: string | null
          venue_name?: string | null
          venue_type?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          event_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          event_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          event_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcast_dismissals: {
        Row: {
          broadcast_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          broadcast_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          broadcast_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          message: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          message: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      client_album_selections: {
        Row: {
          album_name: string | null
          album_type: string
          client_id: string
          id: string
          photo_key: string
          photo_url: string | null
          selected_at: string
        }
        Insert: {
          album_name?: string | null
          album_type: string
          client_id: string
          id?: string
          photo_key: string
          photo_url?: string | null
          selected_at?: string
        }
        Update: {
          album_name?: string | null
          album_type?: string
          client_id?: string
          id?: string
          photo_key?: string
          photo_url?: string | null
          selected_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_album_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contact_details: {
        Row: {
          bride_backup_number: string | null
          bride_backup_number2: string | null
          bride_backup_relation: string | null
          bride_backup_relation2: string | null
          bride_contact_number: string | null
          bride_full_name: string | null
          bride_home_address: string | null
          bride_home_area: string | null
          bride_home_city: string | null
          bride_home_landmark: string | null
          bride_home_lat: number | null
          bride_home_lng: number | null
          bride_home_maps_link: string | null
          bride_home_place_id: string | null
          bride_instagram: string | null
          bride_whatsapp_number: string | null
          client_id: string
          created_at: string
          groom_backup_number: string | null
          groom_backup_number2: string | null
          groom_backup_relation: string | null
          groom_backup_relation2: string | null
          groom_contact_number: string | null
          groom_full_name: string | null
          groom_home_address: string | null
          groom_home_area: string | null
          groom_home_city: string | null
          groom_home_landmark: string | null
          groom_home_lat: number | null
          groom_home_lng: number | null
          groom_home_maps_link: string | null
          groom_home_place_id: string | null
          groom_instagram: string | null
          groom_whatsapp_number: string | null
          id: string
          updated_at: string
        }
        Insert: {
          bride_backup_number?: string | null
          bride_backup_number2?: string | null
          bride_backup_relation?: string | null
          bride_backup_relation2?: string | null
          bride_contact_number?: string | null
          bride_full_name?: string | null
          bride_home_address?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_home_landmark?: string | null
          bride_home_lat?: number | null
          bride_home_lng?: number | null
          bride_home_maps_link?: string | null
          bride_home_place_id?: string | null
          bride_instagram?: string | null
          bride_whatsapp_number?: string | null
          client_id: string
          created_at?: string
          groom_backup_number?: string | null
          groom_backup_number2?: string | null
          groom_backup_relation?: string | null
          groom_backup_relation2?: string | null
          groom_contact_number?: string | null
          groom_full_name?: string | null
          groom_home_address?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_home_landmark?: string | null
          groom_home_lat?: number | null
          groom_home_lng?: number | null
          groom_home_maps_link?: string | null
          groom_home_place_id?: string | null
          groom_instagram?: string | null
          groom_whatsapp_number?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          bride_backup_number?: string | null
          bride_backup_number2?: string | null
          bride_backup_relation?: string | null
          bride_backup_relation2?: string | null
          bride_contact_number?: string | null
          bride_full_name?: string | null
          bride_home_address?: string | null
          bride_home_area?: string | null
          bride_home_city?: string | null
          bride_home_landmark?: string | null
          bride_home_lat?: number | null
          bride_home_lng?: number | null
          bride_home_maps_link?: string | null
          bride_home_place_id?: string | null
          bride_instagram?: string | null
          bride_whatsapp_number?: string | null
          client_id?: string
          created_at?: string
          groom_backup_number?: string | null
          groom_backup_number2?: string | null
          groom_backup_relation?: string | null
          groom_backup_relation2?: string | null
          groom_contact_number?: string | null
          groom_full_name?: string | null
          groom_home_address?: string | null
          groom_home_area?: string | null
          groom_home_city?: string | null
          groom_home_landmark?: string | null
          groom_home_lat?: number | null
          groom_home_lng?: number | null
          groom_home_maps_link?: string | null
          groom_home_place_id?: string | null
          groom_instagram?: string | null
          groom_whatsapp_number?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contact_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_deliverables: {
        Row: {
          album_name: string | null
          client_id: string
          created_at: string
          deliverable_type: string
          enabled: boolean
          event_name: string | null
          id: string
          item_names: string | null
          photographer_notes: string | null
          photographer_toggles: string
          quantity: number
          section: string
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          client_id: string
          created_at?: string
          deliverable_type: string
          enabled?: boolean
          event_name?: string | null
          id?: string
          item_names?: string | null
          photographer_notes?: string | null
          photographer_toggles?: string
          quantity?: number
          section: string
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          client_id?: string
          created_at?: string
          deliverable_type?: string
          enabled?: boolean
          event_name?: string | null
          id?: string
          item_names?: string | null
          photographer_notes?: string | null
          photographer_toggles?: string
          quantity?: number
          section?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_event_locations: {
        Row: {
          client_id: string
          created_at: string
          end_time: string | null
          event_id: string
          guest_count: number | null
          id: string
          parlour_address: string | null
          parlour_lat: number | null
          parlour_lng: number | null
          parlour_name: string | null
          parlour_place_id: string | null
          start_time: string | null
          updated_at: string
          venue_address: string | null
          venue_area: string | null
          venue_city: string | null
          venue_google_map: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_place_id: string | null
          venue_type: string | null
          xito_venue_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          end_time?: string | null
          event_id: string
          guest_count?: number | null
          id?: string
          parlour_address?: string | null
          parlour_lat?: number | null
          parlour_lng?: number | null
          parlour_name?: string | null
          parlour_place_id?: string | null
          start_time?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_area?: string | null
          venue_city?: string | null
          venue_google_map?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
          venue_type?: string | null
          xito_venue_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          end_time?: string | null
          event_id?: string
          guest_count?: number | null
          id?: string
          parlour_address?: string | null
          parlour_lat?: number | null
          parlour_lng?: number | null
          parlour_name?: string | null
          parlour_place_id?: string | null
          start_time?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_area?: string | null
          venue_city?: string | null
          venue_google_map?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
          venue_place_id?: string | null
          venue_type?: string | null
          xito_venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_event_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_event_locations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "agency_client_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_event_locations_xito_venue_id_fkey"
            columns: ["xito_venue_id"]
            isOneToOne: false
            referencedRelation: "xito_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      client_favourite_photos: {
        Row: {
          client_id: string
          created_at: string
          id: string
          photo_key: string
          photo_url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          photo_key: string
          photo_url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          photo_key?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_favourite_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_references: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          entry_type: string
          event_name: string | null
          id: string
          image_url: string | null
          link_title: string | null
          link_url: string | null
          platform: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          entry_type?: string
          event_name?: string | null
          id?: string
          image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          platform?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          entry_type?: string
          event_name?: string | null
          id?: string
          image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_references_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_youtube_videos: {
        Row: {
          client_id: string
          created_at: string
          event_name: string | null
          id: string
          position: number
          title: string | null
          url: string
          video_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          event_name?: string | null
          id?: string
          position?: number
          title?: string | null
          url: string
          video_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          event_name?: string | null
          id?: string
          position?: number
          title?: string | null
          url?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_youtube_videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      crew_assignments: {
        Row: {
          assigned_freelancer: string | null
          created_at: string
          event_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_freelancer?: string | null
          created_at?: string
          event_id: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_freelancer?: string | null
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      edited_files: {
        Row: {
          client_id: string
          created_at: string
          event_name: string | null
          file_name: string | null
          file_path: string | null
          file_size_bytes: number
          file_type: string
          id: string
          mime_type: string | null
          photographer_name: string | null
          side_folder: string | null
          storage_path: string | null
          storage_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          event_name?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number
          file_type?: string
          id?: string
          mime_type?: string | null
          photographer_name?: string | null
          side_folder?: string | null
          storage_path?: string | null
          storage_type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          event_name?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size_bytes?: number
          file_type?: string
          id?: string
          mime_type?: string | null
          photographer_name?: string | null
          side_folder?: string | null
          storage_path?: string | null
          storage_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edited_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      edited_files_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          link_title: string | null
          link_type: string | null
          link_url: string | null
          notes: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          link_title?: string | null
          link_type?: string | null
          link_url?: string | null
          notes?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          link_title?: string | null
          link_type?: string | null
          link_url?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edited_files_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      feed_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_notifications: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          post_id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          post_id: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          post_id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          comments_count: number
          content: string | null
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          likes_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      files_management: {
        Row: {
          backup_1_device_name: string | null
          backup_1_recorded_at: string | null
          backup_2_device_name: string | null
          backup_2_path: string | null
          backup_2_recorded_at: string | null
          backup_3_device_name: string | null
          backup_3_path: string | null
          backup_3_recorded_at: string | null
          backup_history: string | null
          card_label: string | null
          category: string | null
          client_folder_name: string | null
          client_name: string | null
          confirmed: boolean | null
          created_at: string
          deleted_or_not: boolean | null
          double_backup: boolean | null
          double_backup_path: string | null
          drive_link: string | null
          drive_upload: boolean | null
          drive_upload_path: string | null
          event_date_ad: string | null
          event_day: string | null
          event_folder_name: string | null
          event_month: string | null
          event_name: string | null
          event_year: string | null
          final_generated_path: string | null
          format_type: string | null
          freelancer_name: string | null
          freelancer_type: string | null
          id: string
          notes: string | null
          number_of_items: number | null
          reconfirmation: boolean | null
          registered_date_bs: string | null
          registered_date_time_ad: string
          side: string | null
          size_gb: number | null
          storage_device_id: string | null
          storage_type: string | null
          synced_to_sheet: boolean | null
          triple_backup: boolean | null
          triple_backup_path: string | null
          updated_at: string
          user_id: string
          who_copied: string | null
          year_event_folder: string | null
        }
        Insert: {
          backup_1_device_name?: string | null
          backup_1_recorded_at?: string | null
          backup_2_device_name?: string | null
          backup_2_path?: string | null
          backup_2_recorded_at?: string | null
          backup_3_device_name?: string | null
          backup_3_path?: string | null
          backup_3_recorded_at?: string | null
          backup_history?: string | null
          card_label?: string | null
          category?: string | null
          client_folder_name?: string | null
          client_name?: string | null
          confirmed?: boolean | null
          created_at?: string
          deleted_or_not?: boolean | null
          double_backup?: boolean | null
          double_backup_path?: string | null
          drive_link?: string | null
          drive_upload?: boolean | null
          drive_upload_path?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_folder_name?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          final_generated_path?: string | null
          format_type?: string | null
          freelancer_name?: string | null
          freelancer_type?: string | null
          id?: string
          notes?: string | null
          number_of_items?: number | null
          reconfirmation?: boolean | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          side?: string | null
          size_gb?: number | null
          storage_device_id?: string | null
          storage_type?: string | null
          synced_to_sheet?: boolean | null
          triple_backup?: boolean | null
          triple_backup_path?: string | null
          updated_at?: string
          user_id?: string
          who_copied?: string | null
          year_event_folder?: string | null
        }
        Update: {
          backup_1_device_name?: string | null
          backup_1_recorded_at?: string | null
          backup_2_device_name?: string | null
          backup_2_path?: string | null
          backup_2_recorded_at?: string | null
          backup_3_device_name?: string | null
          backup_3_path?: string | null
          backup_3_recorded_at?: string | null
          backup_history?: string | null
          card_label?: string | null
          category?: string | null
          client_folder_name?: string | null
          client_name?: string | null
          confirmed?: boolean | null
          created_at?: string
          deleted_or_not?: boolean | null
          double_backup?: boolean | null
          double_backup_path?: string | null
          drive_link?: string | null
          drive_upload?: boolean | null
          drive_upload_path?: string | null
          event_date_ad?: string | null
          event_day?: string | null
          event_folder_name?: string | null
          event_month?: string | null
          event_name?: string | null
          event_year?: string | null
          final_generated_path?: string | null
          format_type?: string | null
          freelancer_name?: string | null
          freelancer_type?: string | null
          id?: string
          notes?: string | null
          number_of_items?: number | null
          reconfirmation?: boolean | null
          registered_date_bs?: string | null
          registered_date_time_ad?: string
          side?: string | null
          size_gb?: number | null
          storage_device_id?: string | null
          storage_type?: string | null
          synced_to_sheet?: boolean | null
          triple_backup?: boolean | null
          triple_backup_path?: string | null
          updated_at?: string
          user_id?: string
          who_copied?: string | null
          year_event_folder?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      freelancer_profiles: {
        Row: {
          account_type: string
          agency_slug: string | null
          area: string | null
          available_for_travel: boolean | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_name: string | null
          bio: string | null
          business_name: string | null
          camera_body: string | null
          city: string | null
          contact_number: string
          contact_person_2_name: string | null
          contact_person_2_number: string | null
          contact_person_2_whatsapp: string | null
          contact_person_3_name: string | null
          contact_person_3_number: string | null
          contact_person_3_whatsapp: string | null
          created_at: string | null
          drone_model: string | null
          drone_operator: string | null
          editing_setup: string | null
          email: string | null
          facebook: string | null
          fpv_operator: string | null
          full_name: string
          google_map_link: string | null
          hide_booking_dates: boolean
          hide_email: boolean
          hybrid_editor: string | null
          hybrid_shooter: string | null
          id: string
          instagram: string | null
          iphone_shooter: string | null
          lenses: string | null
          main_job: string | null
          pathao_landmark: string | null
          photo_editor: string | null
          photographer: string | null
          portfolio_links: string[] | null
          preferred_event_types: string | null
          profile_photo_url: string | null
          rate_per_day: string | null
          tiktok: string | null
          updated_at: string | null
          user_id: string
          video_editor: string | null
          videographer: string | null
          whatsapp_number: string
          youtube: string | null
        }
        Insert: {
          account_type?: string
          agency_slug?: string | null
          area?: string | null
          available_for_travel?: boolean | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          business_name?: string | null
          camera_body?: string | null
          city?: string | null
          contact_number?: string
          contact_person_2_name?: string | null
          contact_person_2_number?: string | null
          contact_person_2_whatsapp?: string | null
          contact_person_3_name?: string | null
          contact_person_3_number?: string | null
          contact_person_3_whatsapp?: string | null
          created_at?: string | null
          drone_model?: string | null
          drone_operator?: string | null
          editing_setup?: string | null
          email?: string | null
          facebook?: string | null
          fpv_operator?: string | null
          full_name?: string
          google_map_link?: string | null
          hide_booking_dates?: boolean
          hide_email?: boolean
          hybrid_editor?: string | null
          hybrid_shooter?: string | null
          id?: string
          instagram?: string | null
          iphone_shooter?: string | null
          lenses?: string | null
          main_job?: string | null
          pathao_landmark?: string | null
          photo_editor?: string | null
          photographer?: string | null
          portfolio_links?: string[] | null
          preferred_event_types?: string | null
          profile_photo_url?: string | null
          rate_per_day?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id: string
          video_editor?: string | null
          videographer?: string | null
          whatsapp_number?: string
          youtube?: string | null
        }
        Update: {
          account_type?: string
          agency_slug?: string | null
          area?: string | null
          available_for_travel?: boolean | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          business_name?: string | null
          camera_body?: string | null
          city?: string | null
          contact_number?: string
          contact_person_2_name?: string | null
          contact_person_2_number?: string | null
          contact_person_2_whatsapp?: string | null
          contact_person_3_name?: string | null
          contact_person_3_number?: string | null
          contact_person_3_whatsapp?: string | null
          created_at?: string | null
          drone_model?: string | null
          drone_operator?: string | null
          editing_setup?: string | null
          email?: string | null
          facebook?: string | null
          fpv_operator?: string | null
          full_name?: string
          google_map_link?: string | null
          hide_booking_dates?: boolean
          hide_email?: boolean
          hybrid_editor?: string | null
          hybrid_shooter?: string | null
          id?: string
          instagram?: string | null
          iphone_shooter?: string | null
          lenses?: string | null
          main_job?: string | null
          pathao_landmark?: string | null
          photo_editor?: string | null
          photographer?: string | null
          portfolio_links?: string[] | null
          preferred_event_types?: string | null
          profile_photo_url?: string | null
          rate_per_day?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string
          video_editor?: string | null
          videographer?: string | null
          whatsapp_number?: string
          youtube?: string | null
        }
        Relationships: []
      }
      global_lagan_dates: {
        Row: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          bs_day?: number
          bs_month?: number
          bs_year?: number
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: []
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lagan_dates: {
        Row: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bs_day: number
          bs_month: number
          bs_year: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bs_day?: number
          bs_month?: number
          bs_year?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      market_applications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      market_assignments: {
        Row: {
          application_id: string
          assigned_by: string
          assigned_user_id: string
          created_at: string
          id: string
          post_id: string
          status: string
        }
        Insert: {
          application_id: string
          assigned_by: string
          assigned_user_id: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
        }
        Update: {
          application_id?: string
          assigned_by?: string
          assigned_user_id?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
        }
        Relationships: []
      }
      market_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      market_notifications: {
        Row: {
          created_at: string
          from_user_id: string | null
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string | null
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      market_post_dates: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          event_date: string
          freelancer_type: string | null
          id: string
          min_camera: string | null
          post_id: string
          timings: string | null
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          event_date: string
          freelancer_type?: string | null
          id?: string
          min_camera?: string | null
          post_id: string
          timings?: string | null
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          event_date?: string
          freelancer_type?: string | null
          id?: string
          min_camera?: string | null
          post_id?: string
          timings?: string | null
        }
        Relationships: []
      }
      market_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      market_post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      market_posts: {
        Row: {
          created_at: string
          default_area: string | null
          default_city: string | null
          default_min_camera: string | null
          event_name: string
          freelancer_type: string | null
          id: string
          total_price: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_area?: string | null
          default_city?: string | null
          default_min_camera?: string | null
          event_name: string
          freelancer_type?: string | null
          id?: string
          total_price?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_area?: string | null
          default_city?: string | null
          default_min_camera?: string | null
          event_name?: string
          freelancer_type?: string | null
          id?: string
          total_price?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: []
      }
      photo_edit_tracker: {
        Row: {
          client_demand: string
          client_id: string
          company_notes: string
          created_at: string
          deadline: string | null
          deleted: boolean
          edit_started_at: string | null
          edit_type: string
          editor: string
          event_name: string
          id: string
          is_playing: boolean
          photo_edit_status: string
          photographer_name: string
          photographer_role: string
          photographer_side: string
          playing_since: string | null
          reference: string
          stage_history: string
          updated_at: string
          urgency: string
        }
        Insert: {
          client_demand?: string
          client_id: string
          company_notes?: string
          created_at?: string
          deadline?: string | null
          deleted?: boolean
          edit_started_at?: string | null
          edit_type?: string
          editor?: string
          event_name?: string
          id?: string
          is_playing?: boolean
          photo_edit_status?: string
          photographer_name?: string
          photographer_role?: string
          photographer_side?: string
          playing_since?: string | null
          reference?: string
          stage_history?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          client_demand?: string
          client_id?: string
          company_notes?: string
          created_at?: string
          deadline?: string | null
          deleted?: boolean
          edit_started_at?: string | null
          edit_type?: string
          editor?: string
          event_name?: string
          id?: string
          is_playing?: boolean
          photo_edit_status?: string
          photographer_name?: string
          photographer_role?: string
          photographer_side?: string
          playing_since?: string | null
          reference?: string
          stage_history?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      portal_hidden_videos: {
        Row: {
          client_id: string
          created_at: string
          id: string
          video_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          video_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_hidden_videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      r2_deletion_queue: {
        Row: {
          attempts: number
          bucket: string
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          r2_key: string
        }
        Insert: {
          attempts?: number
          bucket: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          r2_key: string
        }
        Update: {
          attempts?: number
          bucket?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          r2_key?: string
        }
        Relationships: []
      }
      r2_janitor_runs: {
        Row: {
          bucket: string
          error: string | null
          id: string
          orphans_enqueued: number
          r2_keys_scanned: number
          ran_at: string
        }
        Insert: {
          bucket: string
          error?: string | null
          id?: string
          orphans_enqueued?: number
          r2_keys_scanned?: number
          ran_at?: string
        }
        Update: {
          bucket?: string
          error?: string | null
          id?: string
          orphans_enqueued?: number
          r2_keys_scanned?: number
          ran_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      storage_devices: {
        Row: {
          cloud_type: string | null
          created_at: string
          device_name: string
          device_type: string
          expiry_date_ad: string | null
          health_percent: number
          id: string
          pc_drive_letter: string | null
          price_npr: number | null
          purchase_date_ad: string | null
          purchase_date_bs: string | null
          purchased_from: string | null
          remaining_storage_gb: number | null
          safety_status: string
          speed_rating: number
          synced_to_sheet: boolean | null
          total_storage_gb: number
          updated_at: string
          used_storage_gb: number
          user_id: string
        }
        Insert: {
          cloud_type?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          expiry_date_ad?: string | null
          health_percent?: number
          id?: string
          pc_drive_letter?: string | null
          price_npr?: number | null
          purchase_date_ad?: string | null
          purchase_date_bs?: string | null
          purchased_from?: string | null
          remaining_storage_gb?: number | null
          safety_status?: string
          speed_rating?: number
          synced_to_sheet?: boolean | null
          total_storage_gb?: number
          updated_at?: string
          used_storage_gb?: number
          user_id?: string
        }
        Update: {
          cloud_type?: string | null
          created_at?: string
          device_name?: string
          device_type?: string
          expiry_date_ad?: string | null
          health_percent?: number
          id?: string
          pc_drive_letter?: string | null
          price_npr?: number | null
          purchase_date_ad?: string | null
          purchase_date_bs?: string | null
          purchased_from?: string | null
          remaining_storage_gb?: number | null
          safety_status?: string
          speed_rating?: number
          synced_to_sheet?: boolean | null
          total_storage_gb?: number
          updated_at?: string
          used_storage_gb?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          reason: string | null
          suspended_by: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          suspended_by: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          reason?: string | null
          suspended_by?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_edit_tracker: {
        Row: {
          client_demand: string
          client_id: string
          colorist: string
          company_notes: string
          created_at: string
          deadline: string | null
          deleted: boolean
          edit_started_at: string | null
          edit_type: string
          editor: string
          event_name: string
          force_split: boolean
          id: string
          is_playing: boolean
          playing_since: string | null
          reference: string
          songs: string
          stage_history: string
          sub_event_name: string
          updated_at: string
          urgency: string
          video_edit_status: string
          youtube_link: string
        }
        Insert: {
          client_demand?: string
          client_id: string
          colorist?: string
          company_notes?: string
          created_at?: string
          deadline?: string | null
          deleted?: boolean
          edit_started_at?: string | null
          edit_type?: string
          editor?: string
          event_name?: string
          force_split?: boolean
          id?: string
          is_playing?: boolean
          playing_since?: string | null
          reference?: string
          songs?: string
          stage_history?: string
          sub_event_name?: string
          updated_at?: string
          urgency?: string
          video_edit_status?: string
          youtube_link?: string
        }
        Update: {
          client_demand?: string
          client_id?: string
          colorist?: string
          company_notes?: string
          created_at?: string
          deadline?: string | null
          deleted?: boolean
          edit_started_at?: string | null
          edit_type?: string
          editor?: string
          event_name?: string
          force_split?: boolean
          id?: string
          is_playing?: boolean
          playing_since?: string | null
          reference?: string
          songs?: string
          stage_history?: string
          sub_event_name?: string
          updated_at?: string
          urgency?: string
          video_edit_status?: string
          youtube_link?: string
        }
        Relationships: []
      }
      xito_venue_photos: {
        Row: {
          id: string
          position: number
          public_url: string
          r2_key: string
          uploaded_at: string
          uploaded_by: string | null
          venue_id: string
        }
        Insert: {
          id?: string
          position?: number
          public_url: string
          r2_key: string
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id: string
        }
        Update: {
          id?: string
          position?: number
          public_url?: string
          r2_key?: string
          uploaded_at?: string
          uploaded_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xito_venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "xito_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      xito_venue_types: {
        Row: {
          created_at: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          name: string
          position: number
        }
        Update: {
          created_at?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      xito_venues: {
        Row: {
          area: string | null
          avatar_r2_key: string | null
          avatar_url: string | null
          bookings_count: number
          city: string | null
          company_phone: string | null
          company_whatsapp: string | null
          cover_r2_key: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          facebook: string | null
          gmail: string | null
          google_map: string | null
          id: string
          instagram: string | null
          lat: number | null
          lng: number | null
          location_briefing: string | null
          owner1_contact: string | null
          owner1_name: string | null
          owner1_whatsapp: string | null
          owner2_contact: string | null
          owner2_name: string | null
          owner2_whatsapp: string | null
          rating: number
          tiktok: string | null
          updated_at: string
          venue_name: string
          venue_type: string
          website: string | null
          youtube: string | null
        }
        Insert: {
          area?: string | null
          avatar_r2_key?: string | null
          avatar_url?: string | null
          bookings_count?: number
          city?: string | null
          company_phone?: string | null
          company_whatsapp?: string | null
          cover_r2_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          facebook?: string | null
          gmail?: string | null
          google_map?: string | null
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          location_briefing?: string | null
          owner1_contact?: string | null
          owner1_name?: string | null
          owner1_whatsapp?: string | null
          owner2_contact?: string | null
          owner2_name?: string | null
          owner2_whatsapp?: string | null
          rating?: number
          tiktok?: string | null
          updated_at?: string
          venue_name: string
          venue_type: string
          website?: string | null
          youtube?: string | null
        }
        Update: {
          area?: string | null
          avatar_r2_key?: string | null
          avatar_url?: string | null
          bookings_count?: number
          city?: string | null
          company_phone?: string | null
          company_whatsapp?: string | null
          cover_r2_key?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          facebook?: string | null
          gmail?: string | null
          google_map?: string | null
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          location_briefing?: string | null
          owner1_contact?: string | null
          owner1_name?: string | null
          owner1_whatsapp?: string | null
          owner2_contact?: string | null
          owner2_name?: string | null
          owner2_whatsapp?: string | null
          rating?: number
          tiktok?: string | null
          updated_at?: string
          venue_name?: string
          venue_type?: string
          website?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xito_venues_venue_type_fkey"
            columns: ["venue_type"]
            isOneToOne: false
            referencedRelation: "xito_venue_types"
            referencedColumns: ["name"]
          },
        ]
      }
    }
    Views: {
      r2_deletion_failed: {
        Row: {
          attempts: number | null
          bucket: string | null
          created_at: string | null
          id: string | null
          last_attempt_at: string | null
          last_error: string | null
          r2_key: string | null
        }
        Insert: {
          attempts?: number | null
          bucket?: string | null
          created_at?: string | null
          id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          r2_key?: string | null
        }
        Update: {
          attempts?: number | null
          bucket?: string | null
          created_at?: string | null
          id?: string | null
          last_attempt_at?: string | null
          last_error?: string | null
          r2_key?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _slugify: { Args: { p_in: string }; Returns: string }
      add_agency_finance_bank:
        | {
            Args: {
              _account_holder_name: string
              _agency_user_id: string
              _bank_name: string
            }
            Returns: Json
          }
        | {
            Args: { _account_holder_name: string; _bank_name: string }
            Returns: Json
          }
      admin_link_orphan_to_user: {
        Args: { _target_user: string }
        Returns: Json
      }
      admin_list_users: {
        Args: { _limit?: number; _search?: string }
        Returns: {
          account_type: string
          contact_number: string
          created_at: string
          email: string
          full_name: string
          is_admin: boolean
          is_suspended: boolean
          profile_photo_url: string
          suspension_reason: string
          user_id: string
        }[]
      }
      admin_list_venue_bookings: {
        Args: { p_venue_id: string }
        Returns: {
          bride_name: string
          client_id: string
          company_name: string
          end_time: string
          event_date_ad: string
          event_id: string
          event_name: string
          groom_name: string
          start_time: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_set_role: {
        Args: { _make_admin: boolean; _target_user: string }
        Returns: undefined
      }
      admin_set_suspension: {
        Args: { _reason?: string; _suspend: boolean; _target_user: string }
        Returns: undefined
      }
      admin_signups_by_day: {
        Args: { _days?: number }
        Returns: {
          day: string
          signups: number
        }[]
      }
      are_mutual_followers: {
        Args: { user1: string; user2: string }
        Returns: boolean
      }
      can_access_company:
        | { Args: { _agency: string; _section: string }; Returns: boolean }
        | { Args: { _agency: string; _sections: string[] }; Returns: boolean }
      client_belongs_to_my_agency: {
        Args: { _client_id: string }
        Returns: boolean
      }
      delete_agency_client_payment:
        | {
            Args: { _agency_user_id: string; _payment_id: string; _pin: string }
            Returns: Json
          }
        | { Args: { _payment_id: string; _pin: string }; Returns: Json }
      extract_youtube_id: { Args: { url: string }; Returns: string }
      gen_portal_token: { Args: never; Returns: string }
      has_agency_finance_pin:
        | { Args: never; Returns: boolean }
        | { Args: { _agency_user_id?: string }; Returns: boolean }
      has_company_role: {
        Args: { _agency: string; _role: string; _staff: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_suspended: { Args: { _user_id: string }; Returns: boolean }
      link_orphan_profile_to_current_user: { Args: never; Returns: Json }
      portal_add_family_member: {
        Args: {
          p_client: string
          p_name: string
          p_role: string
          p_side: string
          p_token: string
        }
        Returns: string
      }
      portal_add_reference: {
        Args: { p_client: string; p_data: Json; p_token: string }
        Returns: {
          client_id: string
          created_at: string
          description: string | null
          entry_type: string
          event_name: string | null
          id: string
          image_url: string | null
          link_title: string | null
          link_url: string | null
          platform: string | null
        }
        SetofOptions: {
          from: "*"
          to: "client_portal_references"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_backfill_venue_coords: {
        Args: {
          p_client: string
          p_lat: number
          p_lng: number
          p_token: string
          p_venue_id: string
        }
        Returns: boolean
      }
      portal_create_reference_photo: {
        Args: { p_client: string; p_event_name: string; p_token: string }
        Returns: string
      }
      portal_delete_family_member: {
        Args: { p_client: string; p_member_id: string; p_token: string }
        Returns: string
      }
      portal_delete_reference: {
        Args: { p_client: string; p_ref_id: string; p_token: string }
        Returns: string
      }
      portal_hide_video: {
        Args: { p_client: string; p_token: string; p_video_id: string }
        Returns: undefined
      }
      portal_read_bundle: {
        Args: { p_client: string; p_token: string }
        Returns: Json
      }
      portal_regenerate_token: { Args: { p_client: string }; Returns: string }
      portal_search_venues: {
        Args: {
          p_client: string
          p_limit?: number
          p_q: string
          p_token: string
        }
        Returns: {
          area: string
          avatar_url: string
          city: string
          cover_url: string
          google_map: string
          id: string
          lat: number
          lng: number
          venue_name: string
          venue_type: string
        }[]
      }
      portal_set_album_selection: {
        Args: {
          p_album_name: string
          p_album_type: string
          p_client: string
          p_photo_key: string
          p_photo_url: string
          p_selected: boolean
          p_token: string
        }
        Returns: undefined
      }
      portal_set_couple_photo: {
        Args: { p_client: string; p_token: string; p_url: string }
        Returns: undefined
      }
      portal_set_enabled: {
        Args: { p_client: string; p_enabled: boolean }
        Returns: undefined
      }
      portal_set_family_member_photo: {
        Args: {
          p_client: string
          p_member_id: string
          p_token: string
          p_url: string
        }
        Returns: undefined
      }
      portal_set_reference_image: {
        Args: {
          p_client: string
          p_ref_id: string
          p_token: string
          p_url: string
        }
        Returns: undefined
      }
      portal_submit_album: {
        Args: { p_client: string; p_payload: Json; p_token: string }
        Returns: {
          album_details: Json
          bride_name: string | null
          client_id: string
          created_at: string
          custom_text: string | null
          groom_name: string | null
          handled: boolean
          handled_response: string | null
          id: string
          selected_date: string | null
        }
        SetofOptions: {
          from: "*"
          to: "album_selection_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_toggle_favourite: {
        Args: {
          p_client: string
          p_photo_key: string
          p_photo_url: string
          p_token: string
        }
        Returns: boolean
      }
      portal_unhide_video: {
        Args: { p_client: string; p_token: string; p_video_id: string }
        Returns: undefined
      }
      portal_update_family_member: {
        Args: {
          p_client: string
          p_member_id: string
          p_name: string
          p_role: string
          p_side: string
          p_token: string
        }
        Returns: undefined
      }
      portal_upsert_contact: {
        Args: { p_client: string; p_data: Json; p_token: string }
        Returns: {
          bride_backup_number: string | null
          bride_backup_number2: string | null
          bride_backup_relation: string | null
          bride_backup_relation2: string | null
          bride_contact_number: string | null
          bride_full_name: string | null
          bride_home_address: string | null
          bride_home_area: string | null
          bride_home_city: string | null
          bride_home_landmark: string | null
          bride_home_lat: number | null
          bride_home_lng: number | null
          bride_home_maps_link: string | null
          bride_home_place_id: string | null
          bride_instagram: string | null
          bride_whatsapp_number: string | null
          client_id: string
          created_at: string
          groom_backup_number: string | null
          groom_backup_number2: string | null
          groom_backup_relation: string | null
          groom_backup_relation2: string | null
          groom_contact_number: string | null
          groom_full_name: string | null
          groom_home_address: string | null
          groom_home_area: string | null
          groom_home_city: string | null
          groom_home_landmark: string | null
          groom_home_lat: number | null
          groom_home_lng: number | null
          groom_home_maps_link: string | null
          groom_home_place_id: string | null
          groom_instagram: string | null
          groom_whatsapp_number: string | null
          id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "client_contact_details"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_upsert_event_location: {
        Args: {
          p_client: string
          p_data: Json
          p_event_id: string
          p_token: string
        }
        Returns: {
          client_id: string
          created_at: string
          end_time: string | null
          event_id: string
          guest_count: number | null
          id: string
          parlour_address: string | null
          parlour_lat: number | null
          parlour_lng: number | null
          parlour_name: string | null
          parlour_place_id: string | null
          start_time: string | null
          updated_at: string
          venue_address: string | null
          venue_area: string | null
          venue_city: string | null
          venue_google_map: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
          venue_place_id: string | null
          venue_type: string | null
          xito_venue_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "client_event_locations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      portal_verify: {
        Args: { _client: string; _token: string }
        Returns: boolean
      }
      portal_verify_token: {
        Args: { p_client: string; p_token: string }
        Returns: {
          agency_slug: string
          client_id: string
          user_id: string
        }[]
      }
      revoke_finance_access: { Args: { _staff: string }; Returns: Json }
      set_active_agency: { Args: { _agency: string }; Returns: undefined }
      set_agency_finance_pin: { Args: { _pin: string }; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_company_roles: {
        Args: { _staff: string }
        Returns: {
          agency_user_id: string
          business_name: string
          full_name: string
          profile_photo_url: string
          roles: string[]
        }[]
      }
      update_agency_client_finance:
        | {
            Args: {
              _client_id: string
              _package_amount: number
              _payment_amount?: number
              _payment_date?: string
              _payment_date_bs?: string
              _payment_note?: string
              _pin: string
            }
            Returns: Json
          }
        | {
            Args: {
              _client_id: string
              _package_amount: number
              _payment_amount?: number
              _payment_date?: string
              _payment_date_bs?: string
              _payment_note?: string
              _payment_type?: string
              _pin: string
            }
            Returns: Json
          }
      update_agency_client_finance_add_payment:
        | {
            Args: {
              _agency_user_id: string
              _amount: number
              _bank_id?: string
              _client_id: string
              _is_opening_balance?: boolean
              _payment_date?: string
              _payment_date_bs?: string
              _payment_note?: string
              _payment_type?: string
              _session_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount: number
              _bank_id?: string
              _client_id: string
              _is_opening_balance?: boolean
              _payment_date?: string
              _payment_date_bs?: string
              _payment_note?: string
              _payment_type?: string
              _session_token: string
            }
            Returns: Json
          }
      update_agency_client_finance_edit_payments:
        | {
            Args: {
              _agency_user_id: string
              _client_id: string
              _package_amount: number
              _payments?: Json
              _session_token: string
            }
            Returns: Json
          }
        | {
            Args: {
              _client_id: string
              _package_amount: number
              _payments?: Json
              _session_token: string
            }
            Returns: Json
          }
      upsert_crew_assignment_scoped: {
        Args: {
          _agency_user_id: string
          _assigned_freelancer: string
          _event_id: string
          _role: string
        }
        Returns: {
          assigned_freelancer: string | null
          created_at: string
          event_id: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "crew_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_agency_finance_pin: {
        Args: { _agency_user_id?: string; _pin: string }
        Returns: Json
      }
      verify_agency_finance_session: {
        Args: { _token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
