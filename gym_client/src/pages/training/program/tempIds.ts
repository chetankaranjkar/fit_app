let tempIdCounter = -1

/** Unique negative ID for client-only (unsaved) entities. */
export function nextTempId(): number {
  tempIdCounter -= 1
  return tempIdCounter
}
