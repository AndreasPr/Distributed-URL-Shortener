// Presentation only: user-editable metadata must never grant permissions.
export function displayName(metadata: Record<string, unknown> | undefined): string {
  for (const field of ['display_name', 'full_name', 'name']) {
    const value = metadata?.[field]
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
