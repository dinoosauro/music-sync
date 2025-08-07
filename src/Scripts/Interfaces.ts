/**
 * Information about a singer
 */
export interface AuthorsStorage {
    /**
     * The name of the author
     */
    name: string,
    /**
     * The ID of the author
     */
    id: string,
    /**
     * If the author has sang this verse/word
     */
    checked?: boolean
}

/**
 * Word-by-word object
 */
export interface InnerLyricsStorage {
    /**
     * Duration in seconds where this word starts
     */
    start: number,
    /**
     * The content of this word
     */
    verse: string,
    /**
     * The random ID of this word
     */
    id: string,
    /**
     * The authors that have sang this word
     */
    authors: AuthorsStorage[],
    /**
     * If this word is a background voice
     */
    isBackground?: boolean
}
/**
 * Verse object
 */
export interface LyricsStorage {
    /**
     * Duration in seconds where this verse starts
     */
    start: number,
    /**
     * The content of this verse.
     * Note that this will only be updated if `words` is undefined (so, if the user isn't using word-by-word syncing).
     * If `words` is available, please use that to fetch the actual verse content.
     */
    verse: string,
    /**
     * The authors of the verse
     */
    authors?: AuthorsStorage[],
    /**
     * The random ID of the verse
     */
    id: string
    /**
     * The single words that compose this verse. This array is provided only if the user has enabled word-by-word syncing
     */
    words?: InnerLyricsStorage[],
    /**
     * The name of the stanza that starts with this verse. If undefined, it's a continuation of the stanza before
     */
    paragraphName?: string,
    /**
     * If the entire verse comes from a background voice
     */
    isBackground?: boolean
}
