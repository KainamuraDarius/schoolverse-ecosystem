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
      assessments: {
        Row: {
          assessed_on: string
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          class_id: string | null
          created_at: string
          id: string
          max_score: number
          notes: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          score: number
          score_comment: string | null
          student_id: string | null
          student_name: string | null
          subject_id: string
          subject_name: string | null
          term: string
          title: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          assessed_on?: string
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          class_id?: string | null
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          score?: number
          score_comment?: string | null
          student_id?: string | null
          student_name?: string | null
          subject_id: string
          subject_name?: string | null
          term?: string
          title?: string
          updated_at?: string
          user_id: string
          weight?: number
        }
        Update: {
          assessed_on?: string
          assessment_type?: Database["public"]["Enums"]["assessment_type"]
          class_id?: string | null
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          score?: number
          score_comment?: string | null
          student_id?: string | null
          student_name?: string | null
          subject_id?: string
          subject_name?: string | null
          term?: string
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      book_resources: {
        Row: {
          created_at: string
          description: string
          id: string
          pinned: boolean
          resource_type: Database["public"]["Enums"]["resource_type"]
          subject_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          pinned?: boolean
          resource_type?: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          pinned?: boolean
          resource_type?: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      book_topics: {
        Row: {
          content_html: string
          cover_color: string
          created_at: string
          cross_subject_links: Json
          estimated_minutes: number
          id: string
          lesson_label: string | null
          model_embed_url: string | null
          owner_id: string
          published: boolean
          simulation_url: string | null
          slug: string
          subject_name: string
          subject_slug: string
          summary: string
          title: string
          topic_order: number
          updated_at: string
        }
        Insert: {
          content_html?: string
          cover_color?: string
          created_at?: string
          cross_subject_links?: Json
          estimated_minutes?: number
          id?: string
          lesson_label?: string | null
          model_embed_url?: string | null
          owner_id: string
          published?: boolean
          simulation_url?: string | null
          slug: string
          subject_name: string
          subject_slug: string
          summary?: string
          title: string
          topic_order?: number
          updated_at?: string
        }
        Update: {
          content_html?: string
          cover_color?: string
          created_at?: string
          cross_subject_links?: Json
          estimated_minutes?: number
          id?: string
          lesson_label?: string | null
          model_embed_url?: string | null
          owner_id?: string
          published?: boolean
          simulation_url?: string | null
          slug?: string
          subject_name?: string
          subject_slug?: string
          summary?: string
          title?: string
          topic_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      class_enrollments: {
        Row: {
          admission_no: string | null
          class_id: string
          created_at: string
          id: string
          owner_id: string
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          admission_no?: string | null
          class_id: string
          created_at?: string
          id?: string
          owner_id: string
          student_id: string
          student_name: string
          updated_at?: string
        }
        Update: {
          admission_no?: string | null
          class_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          badge_seen_at: string | null
          color: string
          created_at: string
          description: string
          end_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          metadata: Json
          notification_minutes: number
          source_id: string | null
          source_type: string | null
          start_at: string
          subject: string | null
          teacher: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          badge_seen_at?: string | null
          color?: string
          created_at?: string
          description?: string
          end_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          metadata?: Json
          notification_minutes?: number
          source_id?: string | null
          source_type?: string | null
          start_at?: string
          subject?: string | null
          teacher?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          badge_seen_at?: string | null
          color?: string
          created_at?: string
          description?: string
          end_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          metadata?: Json
          notification_minutes?: number
          source_id?: string | null
          source_type?: string | null
          start_at?: string
          subject?: string | null
          teacher?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_activity: {
        Row: {
          activity_date: string
          content_percent: number
          created_at: string
          id: string
          lesson_title: string | null
          minutes_spent: number
          note_id: string | null
          owner_id: string
          progress_percent: number
          source: string
          student_id: string
          subject_name: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          activity_date?: string
          content_percent?: number
          created_at?: string
          id?: string
          lesson_title?: string | null
          minutes_spent?: number
          note_id?: string | null
          owner_id: string
          progress_percent?: number
          source: string
          student_id: string
          subject_name?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          content_percent?: number
          created_at?: string
          id?: string
          lesson_title?: string | null
          minutes_spent?: number
          note_id?: string | null
          owner_id?: string
          progress_percent?: number
          source?: string
          student_id?: string
          subject_name?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_activity_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "book_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_attendance: {
        Row: {
          class_id: string | null
          class_name: string | null
          created_at: string
          event_id: string | null
          id: string
          joined_at: string
          left_at: string | null
          lesson_title: string
          minutes_attended: number
          owner_id: string
          status: string
          student_id: string
          subject_name: string | null
          teacher_id: string | null
          updated_at: string
          whiteboard_session_id: string | null
        }
        Insert: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          lesson_title?: string
          minutes_attended?: number
          owner_id: string
          status?: string
          student_id: string
          subject_name?: string | null
          teacher_id?: string | null
          updated_at?: string
          whiteboard_session_id?: string | null
        }
        Update: {
          class_id?: string | null
          class_name?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          lesson_title?: string
          minutes_attended?: number
          owner_id?: string
          status?: string
          student_id?: string
          subject_name?: string | null
          teacher_id?: string | null
          updated_at?: string
          whiteboard_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_attendance_whiteboard_session_id_fkey"
            columns: ["whiteboard_session_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          annotation_marks: Json
          answer_spaces: Json
          auto_tags: Json
          color: string
          content: string
          created_at: string
          exercise_score: number
          exercises: Json | null
          id: string
          lesson_title: string | null
          linked_event_id: string | null
          media_embeds: Json | null
          note_date: string
          pinned: boolean
          reading_progress: number | null
          subject: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_marks?: Json
          answer_spaces?: Json
          auto_tags?: Json
          color?: string
          content?: string
          created_at?: string
          exercise_score?: number
          exercises?: Json | null
          id?: string
          lesson_title?: string | null
          linked_event_id?: string | null
          media_embeds?: Json | null
          note_date?: string
          pinned?: boolean
          reading_progress?: number | null
          subject?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_marks?: Json
          answer_spaces?: Json
          auto_tags?: Json
          color?: string
          content?: string
          created_at?: string
          exercise_score?: number
          exercises?: Json | null
          id?: string
          lesson_title?: string | null
          linked_event_id?: string | null
          media_embeds?: Json | null
          note_date?: string
          pinned?: boolean
          reading_progress?: number | null
          subject?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "book_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_classes: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          stream: string
          teacher_id: string | null
          teacher_name: string | null
          term: string
          timetable_class_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          stream?: string
          teacher_id?: string | null
          teacher_name?: string | null
          term?: string
          timetable_class_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          stream?: string
          teacher_id?: string | null
          teacher_name?: string | null
          term?: string
          timetable_class_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          class_name: string | null
          color: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject_id: string | null
          teacher: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_name?: string | null
          color?: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject_id?: string | null
          teacher?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_name?: string | null
          color?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject_id?: string | null
          teacher?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_lessons: {
        Row: {
          class_id: string
          class_name: string
          conflict_reason: string | null
          created_at: string
          day_of_week: number
          ends_at: string
          id: string
          location: string | null
          period_id: string
          period_label: string
          period_number: number
          plan_id: string
          source_key: string
          starts_at: string
          subject_code: string | null
          subject_color: string
          subject_id: string
          subject_name: string
          teacher_id: string
          teacher_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          class_name: string
          conflict_reason?: string | null
          created_at?: string
          day_of_week: number
          ends_at: string
          id?: string
          location?: string | null
          period_id: string
          period_label: string
          period_number: number
          plan_id: string
          source_key: string
          starts_at: string
          subject_code?: string | null
          subject_color?: string
          subject_id: string
          subject_name: string
          teacher_id: string
          teacher_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          class_name?: string
          conflict_reason?: string | null
          created_at?: string
          day_of_week?: number
          ends_at?: string
          id?: string
          location?: string | null
          period_id?: string
          period_label?: string
          period_number?: number
          plan_id?: string
          source_key?: string
          starts_at?: string
          subject_code?: string | null
          subject_color?: string
          subject_id?: string
          subject_name?: string
          teacher_id?: string
          teacher_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_lessons_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "timetable_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_plans: {
        Row: {
          classes: Json
          constraints: Json
          created_at: string
          id: string
          periods: Json
          schedule_scope_id: string | null
          schedule_scope_type: string
          subjects: Json
          teachers: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classes?: Json
          constraints?: Json
          created_at?: string
          id?: string
          periods?: Json
          schedule_scope_id?: string | null
          schedule_scope_type?: string
          subjects?: Json
          teachers?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classes?: Json
          constraints?: Json
          created_at?: string
          id?: string
          periods?: Json
          schedule_scope_id?: string | null
          schedule_scope_type?: string
          subjects?: Json
          teachers?: Json
          title?: string
          updated_at?: string
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
      whiteboard_elements: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["whiteboard_element_kind"]
          payload: Json
          removed_at: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["whiteboard_element_kind"]
          payload?: Json
          removed_at?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["whiteboard_element_kind"]
          payload?: Json
          removed_at?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_elements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboard_quiz_responses: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          quiz_id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          quiz_id: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          quiz_id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "whiteboard_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboard_sessions: {
        Row: {
          active_quiz: Json | null
          board_snapshot: Json
          created_at: string
          ended_at: string | null
          event_id: string | null
          id: string
          lesson_source_id: string | null
          owner_id: string
          participant_ids: string[]
          recording_log: Json
          room_code: string
          starts_at: string | null
          status: Database["public"]["Enums"]["whiteboard_session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          active_quiz?: Json | null
          board_snapshot?: Json
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          id?: string
          lesson_source_id?: string | null
          owner_id: string
          participant_ids?: string[]
          recording_log?: Json
          room_code?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["whiteboard_session_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          active_quiz?: Json | null
          board_snapshot?: Json
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          id?: string
          lesson_source_id?: string | null
          owner_id?: string
          participant_ids?: string[]
          recording_log?: Json
          room_code?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["whiteboard_session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          created_at: string
          data: Json
          id: string
          thumbnail: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_whiteboard_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_whiteboard_session: { Args: { _room_code: string }; Returns: string }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          roles: string[]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      assessment_type: "test" | "quiz" | "assignment" | "exam" | "project"
      event_type: "lesson" | "assignment" | "exam" | "meeting" | "other"
      resource_type:
        | "video"
        | "simulation"
        | "3d_model"
        | "article"
        | "link"
        | "document"
      session_status: "scheduled" | "attended" | "missed" | "late"
      whiteboard_element_kind: "stroke" | "shape" | "text"
      whiteboard_session_status: "scheduled" | "live" | "ended"
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
      app_role: ["admin", "teacher", "student"],
      assessment_type: ["test", "quiz", "assignment", "exam", "project"],
      event_type: ["lesson", "assignment", "exam", "meeting", "other"],
      resource_type: [
        "video",
        "simulation",
        "3d_model",
        "article",
        "link",
        "document",
      ],
      session_status: ["scheduled", "attended", "missed", "late"],
      whiteboard_element_kind: ["stroke", "shape", "text"],
      whiteboard_session_status: ["scheduled", "live", "ended"],
    },
  },
} as const
