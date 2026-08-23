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
      ai_actions: {
        Row: {
          created_at: string
          id: string
          kind: string
          organization_id: string | null
          payload: Json
          result: Json | null
          status: Database["public"]["Enums"]["ai_action_status"]
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          organization_id?: string | null
          payload?: Json
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_action_status"]
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string | null
          payload?: Json
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_action_status"]
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      documents: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          kind: string
          organization_id: string | null
          title: string
          transfer_id: string | null
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind: string
          organization_id?: string | null
          title: string
          transfer_id?: string | null
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          organization_id?: string | null
          title?: string
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_profiles: {
        Row: {
          available: boolean
          capacity_kg: number
          created_at: string
          currency: string
          id: string
          max_distance_km: number
          notes: string | null
          organization_id: string
          price_per_km: number
          refrigerated: boolean
          service_areas: string[]
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          available?: boolean
          capacity_kg?: number
          created_at?: string
          currency?: string
          id?: string
          max_distance_km?: number
          notes?: string | null
          organization_id: string
          price_per_km?: number
          refrigerated?: boolean
          service_areas?: string[]
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          available?: boolean
          capacity_kg?: number
          created_at?: string
          currency?: string
          id?: string
          max_distance_km?: number
          notes?: string | null
          organization_id?: string
          price_per_km?: number
          refrigerated?: boolean
          service_areas?: string[]
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          distance_km: number | null
          explanation: string | null
          generated_by: string
          id: string
          need_id: string
          quantity: number
          rationale: Json
          recipient_org_id: string
          recipient_response: string | null
          resource_id: string
          score: number
          status: Database["public"]["Enums"]["match_status"]
          supplier_org_id: string
          supplier_response: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          explanation?: string | null
          generated_by?: string
          id?: string
          need_id: string
          quantity?: number
          rationale?: Json
          recipient_org_id: string
          recipient_response?: string | null
          resource_id: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          supplier_org_id: string
          supplier_response?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          explanation?: string | null
          generated_by?: string
          id?: string
          need_id?: string
          quantity?: number
          rationale?: Json
          recipient_org_id?: string
          recipient_response?: string | null
          resource_id?: string
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          supplier_org_id?: string
          supplier_response?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_ai: boolean
          match_id: string | null
          sender_id: string | null
          sender_name: string | null
          transfer_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_ai?: boolean
          match_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          transfer_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          match_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          acceptable_alternatives: string | null
          address: string | null
          category_id: string
          city: string | null
          country: string | null
          created_at: string
          created_by: string
          deadline: string | null
          delivery_requirements: string | null
          fulfilled_quantity: number
          has_refrigeration: boolean
          id: string
          latitude: number | null
          longitude: number | null
          min_quantity: number | null
          organization_id: string
          purpose: string | null
          quantity: number
          status: Database["public"]["Enums"]["need_status"]
          storage_capacity: string | null
          title: string
          unit: string
          updated_at: string
          urgency_score: number
        }
        Insert: {
          acceptable_alternatives?: string | null
          address?: string | null
          category_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          delivery_requirements?: string | null
          fulfilled_quantity?: number
          has_refrigeration?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          min_quantity?: number | null
          organization_id: string
          purpose?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["need_status"]
          storage_capacity?: string | null
          title: string
          unit?: string
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          acceptable_alternatives?: string | null
          address?: string | null
          category_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          delivery_requirements?: string | null
          fulfilled_quantity?: number
          has_refrigeration?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          min_quantity?: number | null
          organization_id?: string
          purpose?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["need_status"]
          storage_capacity?: string | null
          title?: string
          unit?: string
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "needs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      org_admin_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          organization_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          organization_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_admin_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_admin_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      org_verification_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: string
          meta: Json
          note: string | null
          organization_id: string
          status: Database["public"]["Enums"]["verification_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: string
          meta?: Json
          note?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["verification_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          note?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["verification_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "org_verification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_verification_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accepted_privacy_at: string | null
          accepted_terms_at: string | null
          address: string | null
          ai_risk_at: string | null
          ai_risk_level: string | null
          ai_risk_reasons: Json
          city: string | null
          consent_comms_at: string | null
          consent_verification_at: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          doc_kind: Database["public"]["Enums"]["verification_doc_kind"] | null
          doc_path: string | null
          doc_uploaded_at: string | null
          documents: Json
          email_verified: boolean
          id: string
          issuing_authority: string | null
          latitude: number | null
          longitude: number | null
          name: string
          org_category: Database["public"]["Enums"]["org_category"]
          owner_id: string
          phone_verified: boolean
          region: string | null
          registration_country: string | null
          registration_date: string | null
          registration_number: string | null
          reliability_score: number
          rep_full_name: string | null
          rep_position: string | null
          rep_relationship: string | null
          submitted_at: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          website: string | null
        }
        Insert: {
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          address?: string | null
          ai_risk_at?: string | null
          ai_risk_level?: string | null
          ai_risk_reasons?: Json
          city?: string | null
          consent_comms_at?: string | null
          consent_verification_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          doc_kind?: Database["public"]["Enums"]["verification_doc_kind"] | null
          doc_path?: string | null
          doc_uploaded_at?: string | null
          documents?: Json
          email_verified?: boolean
          id?: string
          issuing_authority?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          org_category?: Database["public"]["Enums"]["org_category"]
          owner_id: string
          phone_verified?: boolean
          region?: string | null
          registration_country?: string | null
          registration_date?: string | null
          registration_number?: string | null
          reliability_score?: number
          rep_full_name?: string | null
          rep_position?: string | null
          rep_relationship?: string | null
          submitted_at?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          address?: string | null
          ai_risk_at?: string | null
          ai_risk_level?: string | null
          ai_risk_reasons?: Json
          city?: string | null
          consent_comms_at?: string | null
          consent_verification_at?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          doc_kind?: Database["public"]["Enums"]["verification_doc_kind"] | null
          doc_path?: string | null
          doc_uploaded_at?: string | null
          documents?: Json
          email_verified?: boolean
          id?: string
          issuing_authority?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          org_category?: Database["public"]["Enums"]["org_category"]
          owner_id?: string
          phone_verified?: boolean
          region?: string | null
          registration_country?: string | null
          registration_date?: string | null
          registration_number?: string | null
          reliability_score?: number
          rep_full_name?: string | null
          rep_position?: string | null
          rep_relationship?: string | null
          submitted_at?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resource_categories: {
        Row: {
          active: boolean
          created_at: string
          default_unit: string
          family: string
          id: string
          key: string
          name: string
          perishable: boolean
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_unit?: string
          family: string
          id?: string
          key: string
          name: string
          perishable?: boolean
        }
        Update: {
          active?: boolean
          created_at?: string
          default_unit?: string
          family?: string
          id?: string
          key?: string
          name?: string
          perishable?: boolean
        }
        Relationships: []
      }
      resources: {
        Row: {
          ai_analysis: Json | null
          available_from: string | null
          available_to: string | null
          category_id: string
          city: string | null
          condition: string | null
          country: string | null
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          organization_id: string
          photos: string[]
          pickup_address: string | null
          quantity: number
          requires_refrigeration: boolean
          reserved_quantity: number
          status: Database["public"]["Enums"]["resource_status"]
          storage_requirements: string | null
          title: string
          unit: string
          updated_at: string
          urgency_score: number
        }
        Insert: {
          ai_analysis?: Json | null
          available_from?: string | null
          available_to?: string | null
          category_id: string
          city?: string | null
          condition?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          photos?: string[]
          pickup_address?: string | null
          quantity: number
          requires_refrigeration?: boolean
          reserved_quantity?: number
          status?: Database["public"]["Enums"]["resource_status"]
          storage_requirements?: string | null
          title: string
          unit?: string
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          ai_analysis?: Json | null
          available_from?: string | null
          available_to?: string | null
          category_id?: string
          city?: string | null
          condition?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          photos?: string[]
          pickup_address?: string | null
          quantity?: number
          requires_refrigeration?: boolean
          reserved_quantity?: number
          status?: Database["public"]["Enums"]["resource_status"]
          storage_requirements?: string | null
          title?: string
          unit?: string
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "resources_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "resource_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          confirmed_by: string | null
          created_at: string
          created_by: string
          delivered_at: string | null
          delivered_quantity: number | null
          delivery_instructions: string | null
          delivery_notes: string | null
          delivery_photos: string[]
          distance_km: number | null
          id: string
          impact_verified: boolean
          logistics_org_id: string | null
          match_id: string | null
          need_id: string
          pickup_instructions: string | null
          quantity: number
          recipient_org_id: string
          resource_id: string
          scheduled_delivery_at: string | null
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          supplier_org_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          confirmed_by?: string | null
          created_at?: string
          created_by: string
          delivered_at?: string | null
          delivered_quantity?: number | null
          delivery_instructions?: string | null
          delivery_notes?: string | null
          delivery_photos?: string[]
          distance_km?: number | null
          id?: string
          impact_verified?: boolean
          logistics_org_id?: string | null
          match_id?: string | null
          need_id: string
          pickup_instructions?: string | null
          quantity: number
          recipient_org_id: string
          resource_id: string
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          supplier_org_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          confirmed_by?: string | null
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          delivered_quantity?: number | null
          delivery_instructions?: string | null
          delivery_notes?: string | null
          delivery_photos?: string[]
          distance_km?: number | null
          id?: string
          impact_verified?: boolean
          logistics_org_id?: string | null
          match_id?: string | null
          need_id?: string
          pickup_instructions?: string | null
          quantity?: number
          recipient_org_id?: string
          resource_id?: string
          scheduled_delivery_at?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          supplier_org_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_logistics_org_id_fkey"
            columns: ["logistics_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_logistics_org_id_fkey"
            columns: ["logistics_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations_directory"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      organizations_directory: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          org_category: Database["public"]["Enums"]["org_category"] | null
          owner_id: string | null
          region: string | null
          reliability_score: number | null
          type: Database["public"]["Enums"]["org_type"] | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          org_category?: Database["public"]["Enums"]["org_category"] | null
          owner_id?: string | null
          region?: string | null
          reliability_score?: number | null
          type?: Database["public"]["Enums"]["org_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          org_category?: Database["public"]["Enums"]["org_category"] | null
          owner_id?: string | null
          region?: string | null
          reliability_score?: number | null
          type?: Database["public"]["Enums"]["org_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_touch_match: { Args: { _id: string }; Returns: boolean }
      can_touch_transfer: { Args: { _id: string }; Returns: boolean }
      find_org_duplicates: {
        Args: { _org_id: string }
        Returns: {
          id: string
          name: string
          reason: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      org_is_verified: { Args: { _org_id: string }; Returns: boolean }
      owns_org: { Args: { _org_id: string }; Returns: boolean }
    }
    Enums: {
      ai_action_status:
        | "pending"
        | "approved"
        | "rejected"
        | "executed"
        | "failed"
      app_role: "supplier" | "recipient" | "logistics" | "admin"
      match_status:
        | "proposed"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      need_status: "active" | "partially_fulfilled" | "fulfilled" | "cancelled"
      org_category:
        | "nonprofit_ngo"
        | "charity"
        | "school"
        | "hospital"
        | "government"
        | "community"
        | "religious"
        | "business"
        | "other"
      org_type: "supplier" | "recipient" | "logistics"
      resource_status:
        | "available"
        | "reserved"
        | "unavailable"
        | "transferred"
        | "expired"
      transfer_status:
        | "proposed"
        | "accepted"
        | "scheduled"
        | "pickup_ready"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "impact_verified"
        | "cancelled"
      verification_doc_kind:
        | "certificate_of_registration"
        | "certificate_of_incorporation"
        | "charity_registration"
        | "nonprofit_registration"
        | "government_registration"
        | "business_registration"
        | "tax_exemption"
        | "government_license"
        | "other_official_proof"
      verification_status:
        | "pending"
        | "verified"
        | "rejected"
        | "flagged"
        | "not_verified"
        | "under_review"
        | "info_required"
        | "suspended"
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
      ai_action_status: [
        "pending",
        "approved",
        "rejected",
        "executed",
        "failed",
      ],
      app_role: ["supplier", "recipient", "logistics", "admin"],
      match_status: [
        "proposed",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      need_status: ["active", "partially_fulfilled", "fulfilled", "cancelled"],
      org_category: [
        "nonprofit_ngo",
        "charity",
        "school",
        "hospital",
        "government",
        "community",
        "religious",
        "business",
        "other",
      ],
      org_type: ["supplier", "recipient", "logistics"],
      resource_status: [
        "available",
        "reserved",
        "unavailable",
        "transferred",
        "expired",
      ],
      transfer_status: [
        "proposed",
        "accepted",
        "scheduled",
        "pickup_ready",
        "picked_up",
        "in_transit",
        "delivered",
        "impact_verified",
        "cancelled",
      ],
      verification_doc_kind: [
        "certificate_of_registration",
        "certificate_of_incorporation",
        "charity_registration",
        "nonprofit_registration",
        "government_registration",
        "business_registration",
        "tax_exemption",
        "government_license",
        "other_official_proof",
      ],
      verification_status: [
        "pending",
        "verified",
        "rejected",
        "flagged",
        "not_verified",
        "under_review",
        "info_required",
        "suspended",
      ],
    },
  },
} as const
