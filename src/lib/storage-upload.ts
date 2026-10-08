import { supabase } from "@/lib/supabase/client"

/**
 * 256x256 WebP 변환이 완료된 Blob 이미지를 Supabase user-icons 버킷에 업로드합니다.
 * 기존 이미지가 있을 경우 덮어씁니다 (upsert).
 */
export async function uploadUserIcon(userId: string, gameId: string, imageBlob: Blob): Promise<void> {
  const filePath = `${userId}/${gameId}.webp`

  const { error } = await supabase.storage
    .from('user-icons')
    .upload(filePath, imageBlob, {
      contentType: 'image/webp',
      upsert: true, // 소유자가 아이콘을 교체할 수 있도록 덮어쓰기 허용
    })

  if (error) {
    throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`)
  }
}

/**
 * 비공개 user-icons 버킷에서 로그인한 사용자의 커스텀 아이콘을 Blob 형태로 다운로드한 후,
 * 브라우저에서 렌더링할 수 있는 임시 Object URL로 반환합니다.
 */
export async function downloadUserIcon(userId: string, gameId: string): Promise<string | null> {
  const filePath = `${userId}/${gameId}.webp`

  const { data, error } = await supabase.storage
    .from('user-icons')
    .download(filePath)

  if (error) {
    // 커스텀 아이콘이 없어서 404가 뜨는 경우는 에러가 아니라 기본 아이콘을 보여주면 됨
    if (error.message.includes('not found') || error.message.includes('Object not found') || error.name === 'StorageApiError') {
      return null
    }
    throw new Error(`이미지 다운로드에 실패했습니다: ${error.message}`)
  }

  // Blob 데이터를 브라우저 <img> 태그의 src로 쓸 수 있도록 임시 URL 생성
  return URL.createObjectURL(data)
}

/**
 * 게임 구독을 해지하거나 커스텀 아이콘을 초기화할 때 Storage 객체를 삭제합니다.
 */
export async function deleteUserIcon(userId: string, gameId: string): Promise<void> {
  const filePath = `${userId}/${gameId}.webp`

  const { error } = await supabase.storage
    .from('user-icons')
    .remove([filePath])

  if (error) {
    throw new Error(`이미지 삭제에 실패했습니다: ${error.message}`)
  }
}

// 프로필 사진은 게임 아이콘과 같은 비공개 버킷의 사용자 폴더에 `profile.webp`로 저장한다.
// 계정 삭제 워커가 사용자 폴더 전체를 정리하므로 별도 정리 로직이 필요 없다.
const PROFILE_AVATAR_ID = 'profile'
export const PROFILE_AVATAR_CHANGED_EVENT = 'cl-profile-avatar-changed'

function notifyProfileAvatarChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROFILE_AVATAR_CHANGED_EVENT))
}

export async function uploadProfileAvatar(userId: string, imageBlob: Blob): Promise<void> {
  await uploadUserIcon(userId, PROFILE_AVATAR_ID, imageBlob)
  notifyProfileAvatarChanged()
}

export function downloadProfileAvatar(userId: string): Promise<string | null> {
  return downloadUserIcon(userId, PROFILE_AVATAR_ID)
}

export async function deleteProfileAvatar(userId: string): Promise<void> {
  await deleteUserIcon(userId, PROFILE_AVATAR_ID)
  notifyProfileAvatarChanged()
}