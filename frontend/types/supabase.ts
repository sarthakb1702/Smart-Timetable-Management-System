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
      academic_terms: {
        Row: {
          created_at: string | null
          department_id: string
          end_date: string | null
          id: string
          is_current: boolean | null
          is_locked: boolean | null
          name: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_locked?: boolean | null
          name: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          is_locked?: boolean | null
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          sequence: number
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          sequence: number
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          sequence?: number
        }
        Relationships: []
      }
      batches: {
        Row: {
          created_at: string | null
          division_id: string
          id: string
          name: string
          student_count: number
        }
        Insert: {
          created_at?: string | null
          division_id: string
          id?: string
          name: string
          student_count?: number
        }
        Update: {
          created_at?: string | null
          division_id?: string
          id?: string
          name?: string
          student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      college_settings: {
        Row: {
          day_end_time: string
          day_start_time: string
          id: string
          max_faculty_weekly_hours: number
          slot_duration_minutes: number
          updated_at: string | null
          updated_by: string | null
          working_days: number[]
        }
        Insert: {
          day_end_time: string
          day_start_time: string
          id?: string
          max_faculty_weekly_hours: number
          slot_duration_minutes: number
          updated_at?: string | null
          updated_by?: string | null
          working_days: number[]
        }
        Update: {
          day_end_time?: string
          day_start_time?: string
          id?: string
          max_faculty_weekly_hours?: number
          slot_duration_minutes?: number
          updated_at?: string | null
          updated_by?: string | null
          working_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "college_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academic_year_id: string
          code: string
          created_at: string | null
          credits: number
          department_id: string | null
          id: string
          is_mdm: boolean
          name: string
          parent_course_id: string | null
          session_type: Database["public"]["Enums"]["session_type"]
        }
        Insert: {
          academic_year_id: string
          code: string
          created_at?: string | null
          credits: number
          department_id?: string | null
          id?: string
          is_mdm?: boolean
          name: string
          parent_course_id?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
        }
        Update: {
          academic_year_id?: string
          code?: string
          created_at?: string | null
          credits?: number
          department_id?: string | null
          id?: string
          is_mdm?: boolean
          name?: string
          parent_course_id?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
        }
        Relationships: [
          {
            foreignKeyName: "courses_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_parent_course_id_fkey"
            columns: ["parent_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          academic_year_id: string
          created_at: string | null
          department_id: string
          id: string
          name: string
          student_count: number
          term_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          department_id: string
          id?: string
          name: string
          student_count?: number
          term_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          department_id?: string
          id?: string
          name?: string
          student_count?: number
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_batch_students: {
        Row: {
          created_at: string | null
          elective_batch_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          elective_batch_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          elective_batch_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_batch_students_elective_batch_id_fkey"
            columns: ["elective_batch_id"]
            isOneToOne: false
            referencedRelation: "elective_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_batch_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_batches: {
        Row: {
          created_at: string | null
          elective_option_id: string
          id: string
          lab_room_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          elective_option_id: string
          id?: string
          lab_room_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          elective_option_id?: string
          id?: string
          lab_room_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "elective_batches_elective_option_id_fkey"
            columns: ["elective_option_id"]
            isOneToOne: false
            referencedRelation: "elective_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_batches_lab_room_id_fkey"
            columns: ["lab_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_courses: {
        Row: {
          academic_year_id: string
          code: string
          created_at: string | null
          department_id: string
          id: string
          lab_credits: number
          name: string
          theory_credits: number
        }
        Insert: {
          academic_year_id: string
          code: string
          created_at?: string | null
          department_id: string
          id?: string
          lab_credits?: number
          name: string
          theory_credits?: number
        }
        Update: {
          academic_year_id?: string
          code?: string
          created_at?: string | null
          department_id?: string
          id?: string
          lab_credits?: number
          name?: string
          theory_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "elective_courses_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_options: {
        Row: {
          capacity: number
          created_at: string | null
          elective_course_id: string
          faculty_id: string
          id: string
          term_id: string
          theory_room_id: string | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          elective_course_id: string
          faculty_id: string
          id?: string
          term_id: string
          theory_room_id?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          elective_course_id?: string
          faculty_id?: string
          id?: string
          term_id?: string
          theory_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elective_options_elective_course_id_fkey"
            columns: ["elective_course_id"]
            isOneToOne: false
            referencedRelation: "elective_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_options_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_options_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_options_theory_room_id_fkey"
            columns: ["theory_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      elective_slots: {
        Row: {
          academic_year_id: string
          created_at: string | null
          day_of_week: number
          department_id: string
          end_time: string
          id: string
          locked_at: string | null
          locked_by: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          start_time: string
          status: Database["public"]["Enums"]["lock_status"]
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          day_of_week: number
          department_id: string
          end_time: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          start_time: string
          status?: Database["public"]["Enums"]["lock_status"]
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          day_of_week?: number
          department_id?: string
          end_time?: string
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["lock_status"]
        }
        Relationships: [
          {
            foreignKeyName: "elective_slots_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_slots_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elective_slots_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_course_map: {
        Row: {
          course_id: string
          created_at: string | null
          faculty_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          faculty_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          faculty_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_course_map_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_course_map_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lunch_breaks: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          day_of_week: number | null
          department_id: string | null
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          department_id?: string | null
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          department_id?: string | null
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "lunch_breaks_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lunch_breaks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      mdm_slot_options: {
        Row: {
          course_id: string
          created_at: string | null
          faculty_id: string
          id: string
          mdm_slot_id: string
          room_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          faculty_id: string
          id?: string
          mdm_slot_id: string
          room_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          faculty_id?: string
          id?: string
          mdm_slot_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mdm_slot_options_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdm_slot_options_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdm_slot_options_mdm_slot_id_fkey"
            columns: ["mdm_slot_id"]
            isOneToOne: false
            referencedRelation: "mdm_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdm_slot_options_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mdm_slots: {
        Row: {
          academic_year_id: string
          created_at: string | null
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          locked_at: string | null
          start_time: string
          status: Database["public"]["Enums"]["lock_status"]
        }
        Insert: {
          academic_year_id: string
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          locked_at?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["lock_status"]
        }
        Update: {
          academic_year_id?: string
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          locked_at?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["lock_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mdm_slots_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: true
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mdm_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_course_map: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          room_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          room_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_course_map_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_course_map_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_elective_course_map: {
        Row: {
          created_at: string | null
          elective_course_id: string
          id: string
          room_id: string
        }
        Insert: {
          created_at?: string | null
          elective_course_id: string
          id?: string
          room_id: string
        }
        Update: {
          created_at?: string | null
          elective_course_id?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_elective_course_map_elective_course_id_fkey"
            columns: ["elective_course_id"]
            isOneToOne: false
            referencedRelation: "elective_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_elective_course_map_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string | null
          department_id: string | null
          equipment_tags: string[] | null
          id: string
          name: string
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Insert: {
          capacity: number
          created_at?: string | null
          department_id?: string | null
          equipment_tags?: string[] | null
          id?: string
          name: string
          room_type: Database["public"]["Enums"]["room_type"]
        }
        Update: {
          capacity?: number
          created_at?: string | null
          department_id?: string | null
          equipment_tags?: string[] | null
          id?: string
          name?: string
          room_type?: Database["public"]["Enums"]["room_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_elective_selections: {
        Row: {
          elective_option_id: string
          id: string
          selected_at: string | null
          status: Database["public"]["Enums"]["selection_status"]
          student_id: string
          term_id: string
        }
        Insert: {
          elective_option_id: string
          id?: string
          selected_at?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          student_id: string
          term_id: string
        }
        Update: {
          elective_option_id?: string
          id?: string
          selected_at?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          student_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_elective_selections_elective_option_id_fkey"
            columns: ["elective_option_id"]
            isOneToOne: false
            referencedRelation: "elective_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_elective_selections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_elective_selections_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          academic_year_id: string
          batch_id: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          day_of_week: number
          department_id: string
          division_id: string
          elective_option_id: string | null
          end_time: string
          faculty_id: string
          id: string
          is_locked: boolean
          mdm_slot_option_id: string | null
          room_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          source_type: Database["public"]["Enums"]["slot_source"]
          start_time: string
          status: Database["public"]["Enums"]["timetable_status"]
          term_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          academic_year_id: string
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          department_id: string
          division_id: string
          elective_option_id?: string | null
          end_time: string
          faculty_id: string
          id?: string
          is_locked?: boolean
          mdm_slot_option_id?: string | null
          room_id: string
          session_type: Database["public"]["Enums"]["session_type"]
          source_type: Database["public"]["Enums"]["slot_source"]
          start_time: string
          status?: Database["public"]["Enums"]["timetable_status"]
          term_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          academic_year_id?: string
          batch_id?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          department_id?: string
          division_id?: string
          elective_option_id?: string | null
          end_time?: string
          faculty_id?: string
          id?: string
          is_locked?: boolean
          mdm_slot_option_id?: string | null
          room_id?: string
          session_type?: Database["public"]["Enums"]["session_type"]
          source_type?: Database["public"]["Enums"]["slot_source"]
          start_time?: string
          status?: Database["public"]["Enums"]["timetable_status"]
          term_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_elective_option_id_fkey"
            columns: ["elective_option_id"]
            isOneToOne: false
            referencedRelation: "elective_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_mdm_slot_option_id_fkey"
            columns: ["mdm_slot_option_id"]
            isOneToOne: false
            referencedRelation: "mdm_slot_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_approvals: {
        Row: {
          comments: string | null
          created_at: string | null
          department_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["timetable_status"]
          submitted_at: string | null
          submitted_by: string | null
          term_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          department_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timetable_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          term_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          department_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timetable_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_approvals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_approvals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_approvals_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_edit_log: {
        Row: {
          action: Database["public"]["Enums"]["edit_action"]
          after_data: Json | null
          before_data: Json | null
          changed_by: string
          created_at: string | null
          department_id: string
          id: string
          reason: string | null
          term_id: string
          timetable_entry_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["edit_action"]
          after_data?: Json | null
          before_data?: Json | null
          changed_by: string
          created_at?: string | null
          department_id: string
          id?: string
          reason?: string | null
          term_id: string
          timetable_entry_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["edit_action"]
          after_data?: Json | null
          before_data?: Json | null
          changed_by?: string
          created_at?: string | null
          department_id?: string
          id?: string
          reason?: string | null
          term_id?: string
          timetable_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_edit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_edit_log_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_edit_log_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_edit_log_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          batch_id: string | null
          created_at: string | null
          department_id: string | null
          division_id: string | null
          email: string
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          division_id?: string | null
          email: string
          employee_code?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          division_id?: string | null
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_dept: { Args: never; Returns: string }
      auth_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      edit_action:
        | "create"
        | "update"
        | "delete"
        | "publish"
        | "reject"
        | "submit"
      lock_status: "draft" | "locked"
      room_type: "classroom" | "lab"
      selection_status: "selected" | "waitlisted" | "cancelled"
      session_type: "theory" | "lab"
      slot_source: "regular" | "mdm" | "pe"
      timetable_status: "draft" | "pending_approval" | "published" | "rejected"
      user_role:
        | "student"
        | "faculty"
        | "dept_tt_coordinator"
        | "hod"
        | "college_tt_coordinator"
        | "superadmin"
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
      edit_action: [
        "create",
        "update",
        "delete",
        "publish",
        "reject",
        "submit",
      ],
      lock_status: ["draft", "locked"],
      room_type: ["classroom", "lab"],
      selection_status: ["selected", "waitlisted", "cancelled"],
      session_type: ["theory", "lab"],
      slot_source: ["regular", "mdm", "pe"],
      timetable_status: ["draft", "pending_approval", "published", "rejected"],
      user_role: [
        "student",
        "faculty",
        "dept_tt_coordinator",
        "hod",
        "college_tt_coordinator",
        "superadmin",
      ],
    },
  },
} as const
