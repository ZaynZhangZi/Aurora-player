const avatar = (color, body) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="${color}"/>${body}</svg>`)

export const FOLIA_USER_AVATAR = avatar('#46536c', '<circle cx="40" cy="29" r="13" fill="#dfe8f4"/><path d="M16 68c0-17 10-25 24-25s24 8 24 25" fill="#dfe8f4"/>')
export const FOLIA_ARTIST_AVATAR = avatar('#346d81', '<path d="M36 20v36m0-29 21-6v29" stroke="#dcf4fb" stroke-width="7" fill="none"/><ellipse cx="28" cy="58" rx="12" ry="9" fill="#dcf4fb"/><ellipse cx="49" cy="52" rx="12" ry="9" fill="#dcf4fb"/>')
