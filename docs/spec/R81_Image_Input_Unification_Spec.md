# R81 Specification: Unified Image Input Dialog

- **Author**: Claude Opus (Architect, Run `r81-image-input-unification` Step 1), 2026-11-11
- **Base**: `adb8e72` (manifest `651dc6a`)
- **Reference**: R77 classification icon dialog (`src/app/admin/page.tsx`, `docs/spec/R64_Classification_Option_Icons_Spec.md` §3.2).
- **Status**: Normative for Step 2 and Step 3. Anything not stated here is out of scope.

## 1. Decisions (user, 2026-11-11)

| ID | Decision |
| :--- | :--- |
| D-01 | Every image input except the calendar background uses one shared registration dialog: URL/paste input, file picker, preview, `취소`, register button. |
| D-02 | The calendar background (`calendar-bg-customizer.tsx`) is out of scope (large non-square image, own storage). |
| D-03 | Admin and request screens that already accept URL/paste/file are migrated to the same dialog (one look and behavior everywhere). |
| D-04 | URL fetches keep the existing fallback: direct fetch first, then the `wsrv.nl` proxy (`fetchImageFile`). This applies to user screens too; the user accepted that an entered image URL can reach `wsrv.nl`. |

## 2. Sites

The earlier count "7 admin/request sites" in the run registration was wrong; there are 8 (A1–A8) plus the R77 dialog (A9).

### 2.1 User screens (Step 2) — Storage upload, `resizeImageToWebP` 256×256 WebP ≤ 100 KiB

| ID | Site | Today | Saved when | Storage |
| :--- | :--- | :--- | :--- | :--- |
| U1 | Games page custom game icon (`src/app/dashboard/games/page.tsx`, `handleIconUpload`) | file only | on register (immediate) | `uploadUserIcon(userId, gameId, blob)` |
| U2 | Game add modal custom icon (`src/components/game/game-select-modal.tsx`) | file only, stored as `File` until the game is added | when the game is added (deferred) | `uploadUserIcon` |
| U3 | Owned character settings dialog custom icon (`character-roster.tsx` → `characters/page.tsx` `onChangeIcon`) | file only | on register (immediate) | `uploadCustomCharacterIcon(userId, characterId, blob)` |
| U4 | Profile photo (`src/components/profile/profile-avatar-card.tsx`) | file only | on register (immediate) | `uploadProfileAvatar(userId, blob)` |

Existing delete/restore actions (U1 `deleteUserIcon`, U3 `기본 아이콘 복원`, U4 photo delete) stay as they are, outside the dialog.

### 2.2 Admin and request screens (Step 3) — WebP Data URL stored in the DB

| ID | Site | Converter (unchanged) | AI upscale option | Size check | Saved when |
| :--- | :--- | :--- | :--- | :--- | :--- |
| A1 | Admin schedule form `새 픽업 캐릭터` image | `convertIconSourceToDataUrlWithUpscale` (256) | yes | `assertIconDataUrlSize` (150,000) | with the schedule / pickup registration |
| A2 | Admin character tab `픽업 전용 캐릭터` image | same as A1 (`registerPickupOnlyCharacter`) | yes | 150,000 | on that dialog's save |
| A3 | Admin character form default icon | `convertIconSourceToDataUrlWithUpscale` | yes | 150,000 | on form save |
| A4 | Admin game form default icon | `convertIconSourceToDataUrl` (256) | no | as today | on form save |
| A5 | Admin requests page game icon (approve) | `convertIconSourceToDataUrl` | no | as today | on approve |
| A6 | Admin requests page character icon (approve) | `convertIconSourceToDataUrl` | no | as today | on approve |
| A7 | Request modal character icon (`request-submission-modal.tsx`) | `convertIconSourceToDataUrlWithUpscale` | yes | 150,000 | on request submit |
| A8 | Request modal proposed pickup character image | `convertIconSourceToDataUrlWithUpscale` | yes | 150,000 | on request submit |
| A9 | Admin classification icon (R77) | `createClassificationIconDataUrl` (64) | no | 20,000 | on register (immediate upsert) |

Not inputs, unchanged: the admin bulk `아이콘 재저장` (re-encodes stored icons), the calendar background.

## 3. Shared Dialog

### 3.1 Files

- New `src/lib/image-source.ts`: pure helpers.
  - `resolveImageSource(input: ImageSourceInput, fetchSize: number): Promise<File>` where `ImageSourceInput = { kind: "file"; file: File } | { kind: "text"; text: string }`.
    - `file` → the file.
    - `text` starting with `data:image/` → decoded to a `File` (via `fetch(dataUrl).blob()`), never passed through (R77 rule: data URLs are always re-encoded by the site converter).
    - `text` starting with `http://` or `https://` → `fetchImageFile(text, fetchSize)` (direct, then `wsrv.nl`).
    - anything else → throws `이미지 URL(https://...)을 입력하거나 이미지를 붙여넣거나 파일을 선택해 주세요.`
  - `fetchSize` is the site's output edge (256, or 64 for A9) and is only passed to the proxy.
- New `src/components/ui/image-source-dialog.tsx`: the dialog (Radix `Dialog` from `@/components/ui/dialog`).

### 3.2 API

```ts
interface ImageSourceDialogProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string                      // e.g. "아이콘 등록", "{option} 아이콘 등록"
  description?: string               // e.g. "이미지 URL, 붙여넣기, 파일 중 하나로 등록하면 256×256 WebP로 변환함."
  fetchSize: number                  // 256 by default, 64 for A9
  convert: (file: File) => Promise<T> // site converter; may throw with a user-facing message
  previewSrc: (value: T) => string   // data URL as is, Blob via URL.createObjectURL (dialog revokes it)
  onRegister: (value: T) => Promise<string | null> // null = success (dialog closes), text = error shown in the dialog
  registerLabel?: string             // default "등록"
  extra?: React.ReactNode            // e.g. the A1/A3/A7/A8 AI upscale checkbox
  convertKey?: unknown               // when it changes (e.g. upscale toggled), the current source is converted again
}
```

### 3.3 Behavior

- Layout (same as R77): label `이미지`; text input with placeholder `https://... 또는 이미지 붙여넣기` (`aria-label="이미지 URL"`); file input `accept="image/png,image/jpeg,image/webp"` (`aria-label="이미지 파일"`); preview `img` 64×64 (`alt="미리보기"`); error `role="alert"` inside the dialog; footer `취소` + register button.
- Sources: pasting an image into the text input (`getClipboardImageFile`) or choosing a file uses that file and clears the text; typing text clears the file. Whenever the source changes, the file input is remounted (`key`) so no stale file name stays visible (R77/R78 fix).
- Conversion: the dialog converts the current source once and keeps the result for preview and for register (no second conversion on register).
  - File or pasted image: converted immediately.
  - Text: converted on blur or `Enter` in the text input, and on register if not converted yet.
  - A sequence counter drops results of older sources; `convertKey` changes reconvert the current source.
  - While converting, the preview shows a spinner and the register button is disabled.
- Register: offline (`isOffline()`) → `OFFLINE_WRITE_MESSAGE` in the dialog, nothing fetched or saved. Otherwise `onRegister(value)`; `null` closes the dialog, a string is shown and the dialog stays open. Exceptions from `convert`/`onRegister` are shown with their message.
- Opening resets text, file, preview, error and pending state. `취소`/Esc/overlay close discard the source. Object URLs created for previews are revoked on change and close.
- Accessibility: all controls labelled; the error region is `role="alert"`; focus goes to the text input on open.

## 4. Site Integration

- **Trigger**: each site shows its current image (if any) and a button that opens the dialog (`이미지 선택` when empty, `이미지 변경` when set). Inline URL/paste/file controls at the sites are removed.
- **U1, U3, U4** (immediate): `convert = resizeImageToWebP` (Blob), `onRegister` uploads and refreshes the shown image; upload errors are returned as text. U3 changes `onChangeIcon(character, file: File)` to `onChangeIcon(character, blob: Blob)` so the page uploads the converted blob without resizing again.
- **U2** (deferred): `convert = resizeImageToWebP`; `onRegister` stores the blob in modal state and returns `null`; the game add flow uploads that blob. The button shows `아이콘 선택됨` with a small preview and a remove action.
- **A1–A8** (deferred, form state): `convert` = the converter in §2.2 (with the upscale flag where the site has one) followed by `assertIconDataUrlSize` where listed; `onRegister` stores the data URL in the form state. The form keeps its current "existing icon" handling (stored data URLs are kept unless replaced) and submits as today. The AI upscale checkbox moves into the dialog through `extra`, and `convertKey` is the checkbox value.
- **A9**: `fetchSize = 64`, `convert = createClassificationIconDataUrl`; `onRegister` runs the existing upsert path (`runIconWrite`) and returns its error text (23514 option-changed text, 42501 permission text, other `(code: message)` text unchanged).

## 5. Must Not Regress

- Storage paths, formats and size caps of U1–U4; delete/restore actions.
- A1–A8 saved values (256 WebP data URL), 150,000-character check message, AI upscale availability (`isDesktopAiUpscaleAvailable`, low-resolution hint), existing-icon keep behavior on edit forms, request approve flows.
- A9: 64×64, 20,000-character limit, immediate upsert, per-option write lock, delete button, 23514/42501 messages, migration-missing fallback (section hidden).
- Offline guards on every write.

## 6. Tests

- `src/lib/image-source.test.ts`: file passthrough, data URL decoded to File (never returned as string), http(s) URL uses `fetchImageFile` with `fetchSize`, invalid text error.
- `src/components/ui/image-source-dialog.test.tsx`: file → convert once → preview → register → close; paste image; URL converted on blur and reused on register; stale conversion dropped; `onRegister` error keeps dialog open; offline blocks register without fetching; reopen resets; file input remounted when text replaces a file; `convertKey` reconverts.
- Site tests: each site opens the dialog from its button and saves through it (U1–U4 upload calls with the converted blob; A1–A8 form submit carries the converted data URL; A9 existing R77 tests rewritten against the shared dialog). Existing tests that typed into inline URL inputs are updated to use the dialog.
- `tsc --noEmit`, `npm run lint`, `git diff --check`, full Vitest; `next build` in Step 4.

## 7. Step Scope (allowed files)

- **Step 2 (Claude Sonnet)**: new `src/lib/image-source.ts` (+ test), new `src/components/ui/image-source-dialog.tsx` (+ test), `src/app/dashboard/games/page.tsx` (+ tests), `src/components/game/game-select-modal.tsx` (+ test), `src/components/character/character-roster.tsx`, `src/app/dashboard/characters/page.tsx` (+ `page.test.tsx`), `src/components/profile/profile-avatar-card.tsx` (+ test).
- **Step 3 (Claude Sonnet)**: `src/app/admin/page.tsx` (+ `page.test.tsx`, `page.classification-icons.test.tsx`, other admin page tests that use image inputs), `src/app/admin/requests/page.tsx` (+ test), `src/components/game/request-submission-modal.tsx` (+ test). `src/lib/image-source.ts` / `image-source-dialog.tsx` only for fixes found while migrating (record them).
- Out of scope: `calendar-bg-customizer.tsx`, `src/lib/image-resizer.ts` / `image-upscaler.ts` behavior, SQL.
