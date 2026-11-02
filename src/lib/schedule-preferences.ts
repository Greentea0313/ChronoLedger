import { supabase } from "@/lib/supabase/client"

export interface SchedulePreference {
  showUnofficialSchedules: boolean
  isAvailable: boolean
}

export async function loadSchedulePreference(userId: string): Promise<SchedulePreference> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("사용자 일정 설정을 찾을 수 없습니다.")

  const showUnofficialSchedules = data.show_unofficial_schedules
  return {
    showUnofficialSchedules: showUnofficialSchedules === true,
    isAvailable: typeof showUnofficialSchedules === "boolean",
  }
}

export async function saveSchedulePreference(userId: string, showUnofficialSchedules: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .update({ show_unofficial_schedules: showUnofficialSchedules })
    .eq("id", userId)
    .select("id")
    .single()

  if (error) throw error
  if (!data) throw new Error("사용자 일정 설정을 저장하지 못했습니다.")
}
