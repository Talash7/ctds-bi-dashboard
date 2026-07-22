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
      attendance: {
        Row: {
          course_id: string
          created_at: string
          date: string
          id: string
          present: boolean
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          date: string
          id?: string
          present?: boolean
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string
          id?: string
          present?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity: string | null
          id: string
          user_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity?: string | null
          id?: string
          user_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity?: string | null
          id?: string
          user_email?: string | null
        }
        Relationships: []
      }
      classrooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          schedule: string | null
          usage_pct: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          name: string
          schedule?: string | null
          usage_pct?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          schedule?: string | null
          usage_pct?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          id: string
          level: number
          name: string
          program_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          level: number
          name: string
          program_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_records: {
        Row: {
          budget_total: number
          created_at: string
          financial_aid: number
          id: string
          outstanding: number
          program_id: string
          semester: string | null
          tuition_collected: number
        }
        Insert: {
          budget_total?: number
          created_at?: string
          financial_aid?: number
          id?: string
          outstanding?: number
          program_id: string
          semester?: string | null
          tuition_collected?: number
        }
        Update: {
          budget_total?: number
          created_at?: string
          financial_aid?: number
          id?: string
          outstanding?: number
          program_id?: string
          semester?: string | null
          tuition_collected?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_records_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string
          entity: string
          id: string
          row_count: number
          status: string
          user_email: string | null
        }
        Insert: {
          created_at?: string
          entity: string
          id?: string
          row_count: number
          status: string
          user_email?: string | null
        }
        Update: {
          created_at?: string
          entity?: string
          id?: string
          row_count?: number
          status?: string
          user_email?: string | null
        }
        Relationships: []
      }
      module_kpis: {
        Row: {
          aggregation: string
          bucket_width: number | null
          chart_type: string | null
          column_name: string | null
          default_color: string | null
          default_grid_h: number | null
          default_grid_w: number | null
          default_grid_x: number | null
          default_grid_y: number | null
          display_type: string
          enabled: boolean
          filter_column: string | null
          filter_value: string | null
          format: string
          grid_h: number
          grid_w: number
          grid_x: number | null
          grid_y: number | null
          group_bucket_prefixes: string[] | null
          group_by_column: string | null
          group_by_column_2: string | null
          group_name_prefix: string | null
          id: string
          label: string
          max_value: number | null
          module_id: string
          param_1_label: string | null
          param_1_value: number | null
          param_2_label: string | null
          param_2_value: number | null
          secondary_aggregation: string | null
          secondary_color: string | null
          secondary_column: string | null
          sort_order: number
          target_page: string
          target_value: number | null
          value_colors: Json | null
          x_column: string | null
          y_column: string | null
          zero_fill_values: string[] | null
        }
        Insert: {
          aggregation: string
          bucket_width?: number | null
          chart_type?: string | null
          column_name?: string | null
          default_color?: string | null
          default_grid_h?: number | null
          default_grid_w?: number | null
          default_grid_x?: number | null
          default_grid_y?: number | null
          display_type?: string
          enabled?: boolean
          filter_column?: string | null
          filter_value?: string | null
          format?: string
          grid_h?: number
          grid_w?: number
          grid_x?: number | null
          grid_y?: number | null
          group_bucket_prefixes?: string[] | null
          group_by_column?: string | null
          group_by_column_2?: string | null
          group_name_prefix?: string | null
          id?: string
          label: string
          max_value?: number | null
          module_id: string
          param_1_label?: string | null
          param_1_value?: number | null
          param_2_label?: string | null
          param_2_value?: number | null
          secondary_aggregation?: string | null
          secondary_color?: string | null
          secondary_column?: string | null
          sort_order?: number
          target_page?: string
          target_value?: number | null
          value_colors?: Json | null
          x_column?: string | null
          y_column?: string | null
          zero_fill_values?: string[] | null
        }
        Update: {
          aggregation?: string
          bucket_width?: number | null
          chart_type?: string | null
          column_name?: string | null
          default_color?: string | null
          default_grid_h?: number | null
          default_grid_w?: number | null
          default_grid_x?: number | null
          default_grid_y?: number | null
          display_type?: string
          enabled?: boolean
          filter_column?: string | null
          filter_value?: string | null
          format?: string
          grid_h?: number
          grid_w?: number
          grid_x?: number | null
          grid_y?: number | null
          group_bucket_prefixes?: string[] | null
          group_by_column?: string | null
          group_by_column_2?: string | null
          group_name_prefix?: string | null
          id?: string
          label?: string
          max_value?: number | null
          module_id?: string
          param_1_label?: string | null
          param_1_value?: number | null
          param_2_label?: string | null
          param_2_value?: number | null
          secondary_aggregation?: string | null
          secondary_color?: string | null
          secondary_column?: string | null
          sort_order?: number
          target_page?: string
          target_value?: number | null
          value_colors?: Json | null
          x_column?: string | null
          y_column?: string | null
          zero_fill_values?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "module_kpis_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          enabled: boolean
          icon: string
          id: string
          key: string
          label: string
          sort_order: number
          source_table: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          icon?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          source_table: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          icon?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          source_table?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          department: string | null
          id: string
          name: string
          qualification: string | null
          status: string
          study_duration: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          name: string
          qualification?: string | null
          status?: string
          study_duration?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          qualification?: string | null
          status?: string
          study_duration?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          course_id: string
          created_at: string
          exam_type: string
          grade_letter: string
          grade_points: number
          id: string
          level: number
          score: number | null
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          exam_type?: string
          grade_letter: string
          grade_points: number
          id?: string
          level: number
          score?: number | null
          status: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          exam_type?: string
          grade_letter?: string
          grade_points?: number
          id?: string
          level?: number
          score?: number | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_year: number | null
          batch: string | null
          created_at: string
          enrollment_status: string
          gpa: number | null
          id: string
          level: number
          name: string
          program_id: string
          student_code: string
        }
        Insert: {
          admission_year?: number | null
          batch?: string | null
          created_at?: string
          enrollment_status?: string
          gpa?: number | null
          id?: string
          level: number
          name: string
          program_id: string
          student_code: string
        }
        Update: {
          admission_year?: number | null
          batch?: string | null
          created_at?: string
          enrollment_status?: string
          gpa?: number | null
          id?: string
          level?: number
          name?: string
          program_id?: string
          student_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      results_by_student: {
        Row: {
          admission_year: number | null
          batch: string | null
          course_code: string | null
          course_name: string | null
          enrollment_status: string | null
          exam_type: string | null
          grade_letter: string | null
          grade_points: number | null
          result_id: string | null
          score: number | null
          status: string | null
          student_code: string | null
          student_gpa: number | null
          student_level: number | null
          student_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_kpi_layout: { Args: { p_updates: Json }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_student_gpa: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      reset_kpi_layout_to_default: {
        Args: { p_target_page: string }
        Returns: undefined
      }
      save_current_layout_as_default: {
        Args: { p_target_page: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "dean" | "registrar" | "coordinator"
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
      app_role: ["admin", "dean", "registrar", "coordinator"],
    },
  },
} as const
