// R115: CSV 읽기. 쓰기 규칙(BOM·CRLF·따옴표·수식 방지)은 export-format.ts의 buildCsv가 맡고, 이 파일은 같은 규칙으로 읽는다.

/**
 * RFC 4180 CSV를 행·열 문자열 배열로 나눈다. 앞의 UTF-8 BOM을 지우고, CRLF·LF 줄바꿈과
 * 따옴표 안의 쉼표·줄바꿈·이중 따옴표(`""`)를 처리한다. 파일 끝 줄바꿈은 빈 행을 만들지 않는다.
 */
export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    if (inQuotes) {
      if (ch !== '"') {
        field += ch
      } else if (source[i + 1] === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = false
      }
      continue
    }
    if (ch === '"' && field === "") {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\r" || ch === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      if (ch === "\r" && source[i + 1] === "\n") i += 1
    } else {
      field += ch
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** 파일 바이트를 문자열로 바꾼다. UTF-8로 엄격하게 읽어 보고, 실패하면 국내 Excel 기본값인 EUC-KR(CP949)로 읽는다(I8). */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder("euc-kr").decode(bytes)
  }
}
