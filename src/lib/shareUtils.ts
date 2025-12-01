/**
 * 공유 링크 URL을 생성합니다.
 * @param token - 공유 링크 토큰
 * @param title - 문서 제목
 * @param accessType - 'public'이면 완전 공개 (/public), 'link'면 링크만 공유 (/share)
 * @returns 완전한 공유 링크 URL
 */
export function generateShareUrl(token: string, title: string, accessType: 'private' | 'link' | 'public' = 'link'): string {
  const truncatedTitle = title.substring(0, 30);
  const encodedTitle = encodeURIComponent(truncatedTitle);
  // Use /public for search indexing, /share for link-only
  const prefix = accessType === 'public' ? '/public' : '/share';
  return `${window.location.origin}${prefix}/${token}/${encodedTitle}`;
}
