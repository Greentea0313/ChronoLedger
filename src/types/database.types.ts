
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "account_deletion_requests": {
                  Row: {
                    "attempt_count": number,"data_completed_at": string | null,"email_attempted_at": string | null,"email_sent_at": string | null,"id": string,"last_error_code": string | null,"locked_until": string | null,"requested_at": string,"retry_after": string,"status": string,"status_token_hash": string,"storage_completed_at": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_count"?: number,"data_completed_at"?: string | null,"email_attempted_at"?: string | null,"email_sent_at"?: string | null,"id"?: string,"last_error_code"?: string | null,"locked_until"?: string | null,"requested_at"?: string,"retry_after"?: string,"status"?: string,"status_token_hash": string,"storage_completed_at"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "attempt_count"?: number,"data_completed_at"?: string | null,"email_attempted_at"?: string | null,"email_sent_at"?: string | null,"id"?: string,"last_error_code"?: string | null,"locked_until"?: string | null,"requested_at"?: string,"retry_after"?: string,"status"?: string,"status_token_hash"?: string,"storage_completed_at"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"expenses": {
                  Row: {
                    "billing_cycle": string | null,"cancellation_kind": string | null,"category": string,"created_at": string | null,"deduct_from_asset": boolean,"discount_amount": number,"earned_points": number,"end_date": string | null,"final_amount": number,"game_id": string | null,"id": string,"memo": string | null,"original_price": number,"payment_method": string,"pickup_schedule_id": string | null,"point_discount_amount": number,"point_platform": string | null,"schedule_id": string | null,"start_date": string | null,"status": string,"target_date": string,"template_id": string | null,"title": string,"used_points": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_cycle"?: string | null,"cancellation_kind"?: string | null,"category": string,"created_at"?: string | null,"deduct_from_asset"?: boolean,"discount_amount"?: number,"earned_points"?: number,"end_date"?: string | null,"final_amount"?: number,"game_id"?: string | null,"id"?: string,"memo"?: string | null,"original_price"?: number,"payment_method"?: string,"pickup_schedule_id"?: string | null,"point_discount_amount"?: number,"point_platform"?: string | null,"schedule_id"?: string | null,"start_date"?: string | null,"status"?: string,"target_date": string,"template_id"?: string | null,"title": string,"used_points"?: number,"user_id": string
                  }
                  Update: {
                    "billing_cycle"?: string | null,"cancellation_kind"?: string | null,"category"?: string,"created_at"?: string | null,"deduct_from_asset"?: boolean,"discount_amount"?: number,"earned_points"?: number,"end_date"?: string | null,"final_amount"?: number,"game_id"?: string | null,"id"?: string,"memo"?: string | null,"original_price"?: number,"payment_method"?: string,"pickup_schedule_id"?: string | null,"point_discount_amount"?: number,"point_platform"?: string | null,"schedule_id"?: string | null,"start_date"?: string | null,"status"?: string,"target_date"?: string,"template_id"?: string | null,"title"?: string,"used_points"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_pickup_schedule_id_fkey"
      columns: ["pickup_schedule_id"]
isOneToOne: false
      referencedRelation: "game_schedules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_schedule_id_fkey"
      columns: ["schedule_id"]
isOneToOne: false
      referencedRelation: "game_schedules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "subscription_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"character_requests": {
                  Row: {
                    "admin_memo": string | null,"approved_character_id": string | null,"attributes": Json,"created_at": string,"default_icon_url": string | null,"game_id": string,"id": string,"memo": string | null,"name": string,"rarity": string | null,"request_status": "PENDING" | "APPROVED" | "REJECTED","target_character_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_memo"?: string | null,"approved_character_id"?: string | null,"attributes"?: Json,"created_at"?: string,"default_icon_url"?: string | null,"game_id": string,"id"?: string,"memo"?: string | null,"name": string,"rarity"?: string | null,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","target_character_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "admin_memo"?: string | null,"approved_character_id"?: string | null,"attributes"?: Json,"created_at"?: string,"default_icon_url"?: string | null,"game_id"?: string,"id"?: string,"memo"?: string | null,"name"?: string,"rarity"?: string | null,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","target_character_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "character_requests_approved_character_id_fkey"; columns: ["approved_character_id"]; isOneToOne: false; referencedRelation: "game_characters"; referencedColumns: ["id"] },
                    { foreignKeyName: "character_requests_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] },
                    { foreignKeyName: "character_requests_target_character_id_fkey"; columns: ["target_character_id"]; isOneToOne: false; referencedRelation: "game_characters"; referencedColumns: ["id"] }
                  ]
                },"feedback_requests": {
                  Row: {
                    "admin_answer": string | null,"answered_at": string | null,"answered_by": string | null,"category": "기능 제안" | "오류 신고" | "기타","content": string,"created_at": string,"id": string,"request_status": "PENDING" | "ANSWERED" | "CLOSED","title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_answer"?: string | null,"answered_at"?: string | null,"answered_by"?: string | null,"category": "기능 제안" | "오류 신고" | "기타","content": string,"created_at"?: string,"id"?: string,"request_status"?: "PENDING" | "ANSWERED" | "CLOSED","title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "admin_answer"?: string | null,"answered_at"?: string | null,"answered_by"?: string | null,"category"?: "기능 제안" | "오류 신고" | "기타","content"?: string,"created_at"?: string,"id"?: string,"request_status"?: "PENDING" | "ANSWERED" | "CLOSED","title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: []
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"kind": "FAVORITE_START" | "FAVORITE_END_D1" | "EXPENSE_D1" | "REQUEST_APPROVED" | "REQUEST_REJECTED" | "FEEDBACK_ANSWERED","link_path": string,"push_attempts": number,"push_status": "PENDING" | "SENT" | "SKIPPED" | "FAILED","pushed_at": string | null,"read_at": string | null,"scheduled_for": string | null,"source_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"kind": "FAVORITE_START" | "FAVORITE_END_D1" | "EXPENSE_D1" | "REQUEST_APPROVED" | "REQUEST_REJECTED" | "FEEDBACK_ANSWERED","link_path": string,"push_attempts"?: number,"push_status"?: "PENDING" | "SENT" | "SKIPPED" | "FAILED","pushed_at"?: string | null,"read_at"?: string | null,"scheduled_for"?: string | null,"source_id"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"kind"?: "FAVORITE_START" | "FAVORITE_END_D1" | "EXPENSE_D1" | "REQUEST_APPROVED" | "REQUEST_REJECTED" | "FEEDBACK_ANSWERED","link_path": string,"push_attempts"?: number,"push_status"?: "PENDING" | "SENT" | "SKIPPED" | "FAILED","pushed_at"?: string | null,"read_at"?: string | null,"scheduled_for"?: string | null,"source_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: []
                },"notification_settings": {
                  Row: {
                    "favorite_schedule_end_d1": boolean,"favorite_schedule_start": boolean,"planned_expense_d1": boolean,"push_enabled": boolean,"request_result": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "favorite_schedule_end_d1"?: boolean,"favorite_schedule_start"?: boolean,"planned_expense_d1"?: boolean,"push_enabled"?: boolean,"request_result"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "favorite_schedule_end_d1"?: boolean,"favorite_schedule_start"?: boolean,"planned_expense_d1"?: boolean,"push_enabled"?: boolean,"request_result"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Relationships: []
                },"game_characters": {
                  Row: {
                    "attributes": Json,"created_at": string,"created_by": string | null,"default_icon_url": string | null,"game_id": string,"id": string,"is_pickup_only": boolean,"name": string,"rarity": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attributes"?: Json,"created_at"?: string,"created_by"?: string | null,"default_icon_url"?: string | null,"game_id": string,"id"?: string,"is_pickup_only"?: boolean,"name": string,"rarity"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "attributes"?: Json,"created_at"?: string,"created_by"?: string | null,"default_icon_url"?: string | null,"game_id"?: string,"id"?: string,"is_pickup_only"?: boolean,"name"?: string,"rarity"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "game_characters_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] }
                  ]
                },"game_classification_icons": {
                  Row: {
                    "axis_key": string,"game_id": string,"icon_data_url": string,"option_value": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "axis_key": string,"game_id": string,"icon_data_url": string,"option_value": string,"updated_at"?: string
                  }
                  Update: {
                    "axis_key"?: string,"game_id"?: string,"icon_data_url"?: string,"option_value"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "game_classification_icons_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] }
                  ]
                },"game_requests": {
                  Row: {
                    "admin_memo": string | null,"approved_game_id": string | null,"created_at": string,"id": string,"memo": string | null,"name": string,"request_status": "PENDING" | "APPROVED" | "REJECTED","user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_memo"?: string | null,"approved_game_id"?: string | null,"created_at"?: string,"id"?: string,"memo"?: string | null,"name": string,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","user_id": string
                  }
                  Update: {
                    "admin_memo"?: string | null,"approved_game_id"?: string | null,"created_at"?: string,"id"?: string,"memo"?: string | null,"name"?: string,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_requests_approved_game_id_fkey"
      columns: ["approved_game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"game_schedules": {
                  Row: {
                    "created_at": string | null,"end_at": string | null,"end_at_estimated": boolean,"end_date": string,"game_id": string,"id": string,"is_official": boolean,"is_rerun": boolean,"pickup_character_ids": string[],"memo": string | null,"schedule_type": "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at": string | null,"start_at_estimated": boolean,"start_date": string,"title": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"end_at"?: string | null,"end_at_estimated"?: boolean,"end_date": string,"game_id": string,"id"?: string,"is_official"?: boolean,"is_rerun"?: boolean,"pickup_character_ids"?: string[],"memo"?: string | null,"schedule_type": "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at"?: string | null,"start_at_estimated"?: boolean,"start_date": string,"title": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"end_at"?: string | null,"end_at_estimated"?: boolean,"end_date"?: string,"game_id"?: string,"id"?: string,"is_official"?: boolean,"is_rerun"?: boolean,"pickup_character_ids"?: string[],"memo"?: string | null,"schedule_type"?: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at"?: string | null,"start_at_estimated"?: boolean,"start_date"?: string,"title"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_schedules_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "classification_schema": Json,"created_at": string | null,"created_by": string | null,"daily_reset_time": string | null,"default_icon_url": string,"id": string,"max_breakthrough": number,"max_preset_slots": number,"name": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "classification_schema"?: Json,"created_at"?: string | null,"created_by"?: string | null,"daily_reset_time"?: string | null,"default_icon_url": string,"id"?: string,"max_breakthrough"?: number,"max_preset_slots"?: number,"name": string,"status"?: string
                  }
                  Update: {
                    "classification_schema"?: Json,"created_at"?: string | null,"created_by"?: string | null,"daily_reset_time"?: string | null,"default_icon_url"?: string,"id"?: string,"max_breakthrough"?: number,"max_preset_slots"?: number,"name"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"monthly_budgets": {
                  Row: {
                    "budget_amount": number,"created_at": string | null,"id": string,"month": number,"user_id": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_amount"?: number,"created_at"?: string | null,"id"?: string,"month": number,"user_id": string,"year": number
                  }
                  Update: {
                    "budget_amount"?: number,"created_at"?: string | null,"id"?: string,"month"?: number,"user_id"?: string,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"incomes": {
                  Row: {
                    "amount": number,"category": string,"created_at": string,"id": string,"income_date": string,"memo": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": string,"created_at"?: string,"id"?: string,"income_date": string,"memo"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"category"?: string,"created_at"?: string,"id"?: string,"income_date"?: string,"memo"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"personal_memos": {
                  Row: {
                    "content": string,"created_at": string | null,"id": string,"memo_date": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string | null,"id"?: string,"memo_date": string,"user_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string | null,"id"?: string,"memo_date"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"schedule_requests": {
                  Row: {
                    "admin_memo": string | null,"created_at": string | null,"end_at": string | null,"end_at_estimated": boolean,"end_date": string,"game_id": string,"id": string,"is_official": boolean,"is_rerun": boolean,"pickup_character_ids": string[],"pickup_new_characters": Json,"memo": string | null,"request_status": "PENDING" | "APPROVED" | "REJECTED","schedule_type": "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at": string | null,"start_at_estimated": boolean,"start_date": string,"target_schedule_id": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_memo"?: string | null,"created_at"?: string | null,"end_at"?: string | null,"end_at_estimated"?: boolean,"end_date": string,"game_id": string,"id"?: string,"is_official"?: boolean,"is_rerun"?: boolean,"pickup_character_ids"?: string[],"pickup_new_characters"?: Json,"memo"?: string | null,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","schedule_type": "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at"?: string | null,"start_at_estimated"?: boolean,"start_date": string,"target_schedule_id"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "admin_memo"?: string | null,"created_at"?: string | null,"end_at"?: string | null,"end_at_estimated"?: boolean,"end_date"?: string,"game_id"?: string,"id"?: string,"is_official"?: boolean,"is_rerun"?: boolean,"pickup_character_ids"?: string[],"pickup_new_characters"?: Json,"memo"?: string | null,"request_status"?: "PENDING" | "APPROVED" | "REJECTED","schedule_type"?: "VERSION" | "PICKUP" | "CONTENTS" | "BROADCAST","start_at"?: string | null,"start_at_estimated"?: boolean,"start_date"?: string,"target_schedule_id"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "schedule_requests_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "schedule_requests_target_schedule_id_fkey"
      columns: ["target_schedule_id"]
isOneToOne: false
      referencedRelation: "game_schedules"
      referencedColumns: ["id"]
    }
                  ]
                },"store_point_transactions": {
                  Row: {
                    "amount": number,"balance_after": number,"created_at": string | null,"expense_id": string | null,"id": string,"memo": string | null,"platform": string,"transaction_type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"balance_after": number,"created_at"?: string | null,"expense_id"?: string | null,"id"?: string,"memo"?: string | null,"platform": string,"transaction_type": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"balance_after"?: number,"created_at"?: string | null,"expense_id"?: string | null,"id"?: string,"memo"?: string | null,"platform"?: string,"transaction_type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_point_transactions_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    }
                  ]
                },"store_wallets": {
                  Row: {
                    "current_balance": number,"earn_rate": number,"id": string,"platform": string,"updated_at": string | null,"user_id": string,"user_tier": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current_balance"?: number,"earn_rate"?: number,"id"?: string,"platform": string,"updated_at"?: string | null,"user_id": string,"user_tier"?: string | null
                  }
                  Update: {
                    "current_balance"?: number,"earn_rate"?: number,"id"?: string,"platform"?: string,"updated_at"?: string | null,"user_id"?: string,"user_tier"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"subscription_templates": {
                  Row: {
                    "billing_day": number | null,"category": string,"created_at": string | null,"cycle_type": string,"default_price": number,"game_id": string | null,"id": string,"interval_days": number | null,"is_active": boolean,"payment_method": string,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_day"?: number | null,"category"?: string,"created_at"?: string | null,"cycle_type"?: string,"default_price"?: number,"game_id"?: string | null,"id"?: string,"interval_days"?: number | null,"is_active"?: boolean,"payment_method"?: string,"title": string,"user_id": string
                  }
                  Update: {
                    "billing_day"?: number | null,"category"?: string,"created_at"?: string | null,"cycle_type"?: string,"default_price"?: number,"game_id"?: string | null,"id"?: string,"interval_days"?: number | null,"is_active"?: boolean,"payment_method"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscription_templates_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"user_character_presets": {
                  Row: {
                    "character_ids": string[],"created_at": string,"game_id": string,"id": string,"memo": string | null,"sort_order": number,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "character_ids": string[],"created_at"?: string,"game_id": string,"id"?: string,"memo"?: string | null,"sort_order"?: number,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "character_ids"?: string[],"created_at"?: string,"game_id"?: string,"id"?: string,"memo"?: string | null,"sort_order"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "user_character_presets_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] }
                  ]
                },"user_characters": {
                  Row: {
                    "breakthrough_level": number,"character_id": string,"created_at": string,"custom_icon_path": string | null,"favorite_sort_order": number | null,"game_id": string,"id": string,"is_favorite": boolean,"is_owned": boolean,"memo": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "breakthrough_level"?: number,"character_id": string,"created_at"?: string,"custom_icon_path"?: string | null,"favorite_sort_order"?: number | null,"game_id": string,"id"?: string,"is_favorite"?: boolean,"is_owned"?: boolean,"memo"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "breakthrough_level"?: number,"character_id"?: string,"created_at"?: string,"custom_icon_path"?: string | null,"favorite_sort_order"?: number | null,"game_id"?: string,"id"?: string,"is_favorite"?: boolean,"is_owned"?: boolean,"memo"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "user_characters_character_id_fkey"; columns: ["character_id"]; isOneToOne: false; referencedRelation: "game_characters"; referencedColumns: ["id"] },
                    { foreignKeyName: "user_characters_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] }
                  ]
                },"user_expense_presets": {
                  Row: {
                    "category": "게임" | "식비" | "교통" | "생활" | "기타","created_at": string,"deduct_from_asset": boolean,"game_id": string | null,"id": string,"original_price": number,"payment_method": "WALLET" | "NAVER_PAY","point_platform": "GOOGLE_PLAY" | "GALAXY_STORE" | null,"sort_order": number,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: "게임" | "식비" | "교통" | "생활" | "기타","created_at"?: string,"deduct_from_asset"?: boolean,"game_id"?: string | null,"id"?: string,"original_price": number,"payment_method"?: "WALLET" | "NAVER_PAY","point_platform"?: "GOOGLE_PLAY" | "GALAXY_STORE" | null,"sort_order"?: number,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category"?: "게임" | "식비" | "교통" | "생활" | "기타","created_at"?: string,"deduct_from_asset"?: boolean,"game_id"?: string | null,"id"?: string,"original_price"?: number,"payment_method"?: "WALLET" | "NAVER_PAY","point_platform"?: "GOOGLE_PLAY" | "GALAXY_STORE" | null,"sort_order"?: number,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "user_expense_presets_game_id_fkey"; columns: ["game_id"]; isOneToOne: false; referencedRelation: "games"; referencedColumns: ["id"] }
                  ]
                },"user_favorite_schedules": {
                  Row: {
                    "created_at": string,"id": string,"schedule_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"schedule_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"schedule_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    { foreignKeyName: "user_favorite_schedules_schedule_id_fkey"; columns: ["schedule_id"]; isOneToOne: false; referencedRelation: "game_schedules"; referencedColumns: ["id"] }
                  ]
                },"user_finances": {
                  Row: {
                    "default_budget": number,"id": string,"total_asset": number,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "default_budget"?: number,"id"?: string,"total_asset"?: number,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "default_budget"?: number,"id"?: string,"total_asset"?: number,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_games": {
                  Row: {
                    "created_at": string | null,"custom_icon_path": string | null,"game_id": string,"id": string,"memo": string | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"custom_icon_path"?: string | null,"game_id": string,"id"?: string,"memo"?: string | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"custom_icon_path"?: string | null,"game_id"?: string,"id"?: string,"memo"?: string | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_games_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"id": string,"nickname": string | null,"role": string,"show_unofficial_schedules": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"nickname"?: string | null,"role"?: string,"show_unofficial_schedules"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nickname"?: string | null,"role"?: string,"show_unofficial_schedules"?: boolean
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "account_deletion_is_pending":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"adjust_wallet_balance":
{ Args: { "p_memo"?: string,"p_platform": string,"p_target_balance": number }; Returns: undefined
                           },
"admin_create_game":
{ Args: { "p_default_icon_url": string,"p_name": string }; Returns: string
                           },
"answer_feedback_request":
{ Args: { "p_admin_answer"?: string | null,"p_request_id": string,"p_status"?: string }; Returns: undefined
                           },
"approve_game_request":
{ Args: { "p_default_icon_url": string,"p_request_id": string }; Returns: string
                           },
"approve_character_request":
{ Args: { "p_default_icon_url"?: string | null,"p_request_id": string }; Returns: string
                           },
"approve_schedule_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"cancel_planned_expense":
{ Args: { "p_expense_id": string }; Returns: undefined
                           },
"claim_account_deletion_requests":
{ Args: { "p_limit"?: number }; Returns: {
              "attempt_count": number,
"data_completed_at": string | null,
"email_attempted_at": string | null,
"email_sent_at": string | null,
"id": string,
"last_error_code": string | null,
"locked_until": string | null,
"requested_at": string,
"retry_after": string,
"status": string,
"status_token_hash": string,
"storage_completed_at": string | null,
"updated_at": string,
"user_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "account_deletion_requests"
        isOneToOne: false
        isSetofReturn: true
      } },
"delete_income":
{ Args: { "p_income_id": string }; Returns: undefined
                           },
"delete_subscription_template":
{ Args: { "p_template_id": string }; Returns: undefined
                           },
"dedupe_monthly_planned_expenses":
{ Args: { "p_template_id": string }; Returns: number
                           },
"enqueue_daily_notifications":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_account_deletion_status":
{ Args: { "p_status_token": string }; Returns: Json
                           },
"mark_notifications_read":
{ Args: { "p_notification_ids"?: string[] | null }; Returns: number
                           },
"purge_expired_notifications":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"process_expense_payment":
{ Args: { "p_custom_earned_points"?: number | null,"p_deduct_asset": boolean,"p_discount_amount": number,"p_expense_id": string,"p_memo"?: string | null,"p_original_price": number,"p_payment_date": string,"p_payment_method": string,"p_point_discount_amount": number,"p_point_platform": string | null,"p_used_points": number }; Returns: undefined
                           },
"purge_expired_account_deletion_requests":
{ Args: { "p_limit"?: number }; Returns: number
                           },
"record_income":
{ Args: { "p_amount": number,"p_category": string,"p_income_date": string,"p_memo"?: string | null,"p_title": string }; Returns: string
                           },
"refund_expense_payment":
{ Args: { "p_expense_id": string }; Returns: undefined
                           },
"reject_game_request":
{ Args: { "p_admin_memo"?: string | null,"p_request_id": string }; Returns: undefined
                           },
"reject_character_request":
{ Args: { "p_admin_memo"?: string | null,"p_request_id": string }; Returns: undefined
                           },
"reject_schedule_request":
{ Args: { "p_admin_memo"?: string | null,"p_request_id": string }; Returns: undefined
                           },
"reorder_favorite_characters":
{ Args: { "p_character_ids": string[],"p_game_id": string }; Returns: undefined
                           },
"reorder_character_presets":
{ Args: { "p_game_id": string,"p_preset_ids": string[] }; Returns: undefined
                           },
"request_account_deletion":
{ Args: { "p_confirmation_email": string }; Returns: string
                           },
"update_character_preset_slots":
{ Args: { "p_changes": Json }; Returns: undefined
                           },
"restore_cancelled_expense":
{ Args: { "p_expense_id": string }; Returns: undefined
                           },
"set_user_finance_settings":
{ Args: { "p_default_budget": number,"p_total_asset": number }; Returns: undefined
                           },
"update_confirmed_expense_metadata":
{ Args: { "p_category": string,"p_expense_id": string,"p_memo"?: string | null,"p_target_date"?: string | null,"p_title": string }; Returns: undefined
                           },
"update_store_wallet_settings":
{ Args: { "p_earn_rate": number,"p_platform": string,"p_tier": string | null }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
