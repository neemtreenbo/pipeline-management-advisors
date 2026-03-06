/**
 * Extracts plain text from BlockNote JSON content.
 * Used for previews in note lists and search.
 */
export function extractTextFromContent(content: any, maxLength = 200): string {
    if (!content || !Array.isArray(content)) return ''
    const texts: string[] = []
    for (const block of content) {
        if (Array.isArray(block.content)) {
            for (const inline of block.content) {
                if (inline.type === 'text' && inline.text) texts.push(inline.text)
            }
        }
        if (Array.isArray(block.children)) {
            const childText = extractTextFromContent(block.children, maxLength)
            if (childText) texts.push(childText)
        }
        if (texts.join(' ').length > maxLength) break
    }
    return texts.join(' ').trim()
}
