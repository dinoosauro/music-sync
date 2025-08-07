import { AuthorsStorage, InnerLyricsStorage, LyricsStorage } from "./Interfaces";
import SaveFile from "./SaveFile";

interface TTMLProps {
    /**
     * The authors either fetched from an imported file or chosen by the user
     */
    authors?: AuthorsStorage[],
    /**
     * The lyrics object
     */
    finalLyrics: LyricsStorage[],
    /**
    * If the script should add the singer tag in each verse
    */
    paragraphAuthor?: boolean,
    /**
    * If the script should add the singer tag in each word.
    * Might cause some issues on some players-
    */
    wordParagraph?: boolean,
    /**
     * If a space should be added at the end of each word
     */
    addSpace?: boolean,
    /**
     * The name of the file
     */
    name?: string,
    /**
     * If the output TTML file should be synced word-by-word
     */
    wordByWord?: boolean
}

interface LRCProps {
    finalLyrics: LyricsStorage[],
    name?: string,
    /**
    * If, instead of using the HH:MM:SS.hh, the seconds will be kept
    */
    keepSeconds?: boolean,
    /**
    * Add authors in the LRC file. They can be added following the v1: v2: v3: syntax, or the M: F: D: syntax
     */
    keepAuthors?: boolean,
    /**
    * If the output LRC should be synced word-by-word
    */
    keepWordByWord?: boolean,
    /**
    * If a new line should be added for background voices. 
    * If false, text marked as background voice in the middle of a verse will be treated as normal text.
    */
    putBackgroundInNewLine?: boolean,
    /**
    * Add the paragraph name between square brackets in the LRC file.
    * If false, no paragraph name will be added
    */
    addParagraphName?: boolean,
    /**
    * If the Walaoke syntax should be used for multiple authors (M: F: D:)
    */
    walaoke?: boolean
    /**
    * If the Walaoke syntax should be used, the first author is a male.
    */
    walaokeIsMaleFirst?: boolean
}
export default {
    /**
     * Convert the `finalLyrics` object to a LRC File
     */
    toLRC: ({ finalLyrics, name, keepSeconds, keepAuthors, keepWordByWord, putBackgroundInNewLine, addParagraphName = true, walaoke, walaokeIsMaleFirst }: LRCProps) => {
        console.log(keepAuthors);
        /**
         * Map the items in the "finalLyrics.current" array to obtain a LRC file
         */
        const outputStr = finalLyrics.map(({ start, verse, words, authors, isBackground, paragraphName }) => {
            if (words) {
                start = words[0].start;
                /**
                 * The current line
                 */
                let output = `[${keepSeconds ? start : getValue(start)}]`;
                if (paragraphName && addParagraphName) output = `${output}[${paragraphName}]\n${output}`; // Let's add the paragraph name between square brackets
                let speakerStr = "";
                if (keepAuthors) { // We need to look to the authors. We'll first get all the checked authors, and later we'll have to add the main author, the featuring and/or the group. If Walaoke syntax is used, we also need to check if the first author is male or female.
                    const getSpeakers = Array.from(new Set([...words.map(i => i.authors.filter(e => e.checked)).flat().map(i => i.id), ...(authors ?? []).filter(e => e.checked).flat().map(i => i.id)]));
                    speakerStr = getSpeakers.length === 0 ? "" : getSpeakers.length === 1 ? `${words[0].authors.findIndex(i => i.id === getSpeakers[0]) === 0 ? (walaoke ? walaokeIsMaleFirst ? "M" : "F" : "v1") : (walaoke ? walaokeIsMaleFirst ? "F" : "M" : "v2")}: ` : (walaoke ? "D: " : "v3: ");
                    output += speakerStr
                    if (isBackground) output += `[bg:] `; // We can add the background tag without checking the `putBackgroundInNewLine` property since we are already in a new line.
                }
                if (keepWordByWord) { // We'll have to add the word sync syntax (<>)
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i];
                        // If only that a part of the words are in background, we'll need to add a new line with the [bg:] attribute so that some players will read it in background. If the user, however, doesn't want to split the current line, we'll just add nothing. 
                        output += `${word.isBackground && !isBackground && putBackgroundInNewLine && i !== 0 && !words[i - 1].isBackground ? `\n[${keepSeconds ? start : getValue(start)}]${speakerStr}` : putBackgroundInNewLine && !word.isBackground && i !== 0 && words[i - 1].isBackground ? `\n[${keepSeconds ? start : getValue(word.start)}]${speakerStr}` : ""}<${keepSeconds ? word.start : getValue(word.start)}>${word.verse} `;
                    }
                } else output += words.map(i => i.verse).join(" ");
                return output;
            }
            if (authors && keepAuthors) { // There's no division between words, so we'll just check if there are some
                const getSpeakers = Array.from(new Set(authors.filter(item => item.checked).map(i => i.id)));
                if (getSpeakers.length !== 0) return `[${keepSeconds ? start : getValue(start)}]${getSpeakers.length === 0 ? "" : getSpeakers.length === 1 ? `${authors[0].checked ? (walaoke ? walaokeIsMaleFirst ? "M" : "F" : "v1") : (walaoke ? walaokeIsMaleFirst ? "F" : "M" : "v2")}: ` : (walaoke ? "D: " : "v3: ")}${verse}`
            }
            return `[${keepSeconds ? start : getValue(start)}]${verse}`; // Return normal LRC
        }).join("\n");
        SaveFile({ suggestedName: `${name}.${keepSeconds ? "txt" : "lrc"}`, types: [{ description: `The output ${keepSeconds ? "LRC" : "TXT"} file`, accept: { "text/plain": keepSeconds ? [".txt"] : [".lrc", ".txt"] } }], content: new Blob([outputStr]) });
    },
    /**
     * Convert the `finalLyrics` object to a TTML File
     */
    toTTML: ({ authors, finalLyrics, paragraphAuthor = true, wordParagraph, addSpace = true, name, wordByWord = true }: TTMLProps) => {
        const xml = document.implementation.createDocument(null, "tt");
        const root = xml.documentElement;
        // Let's add the standard elements. For TTML files, we'll use Apple Music as a reference: https://help.apple.com/itc/videoaudioassetguide/#/itcd7579a252
        for (const [key, value] of [["xmlns", "http://www.w3.org/ns/ttml"], ["xmlns:ttm", "http://www.w3.org/ns/ttml#metadata"], ["xml:lang", "en"], ["xmlns:tts", "http://www.w3.org/ns/ttml#styling"], ["xmlns:itunes", "http://itunes.apple.com/lyric-ttml-extensions"]]) root.setAttribute(key, value);
        const head = xml.createElement("head");
        const metadata = xml.createElement("metadata");
        /**
         * Create a new agent, that is used to indicate a singer or a group
         * @param type the type of the new agent (ex: `person`; `group`)
         * @param id the ID of the new agent created
         * @param idName the name of the new agent
         */
        function createAgent(type: string, id: string, idName: string) {
            const agent = xml.createElement("ttm:agent");
            for (const [key, value] of [["type", type], ["xml:id", id]]) agent.setAttribute(key, value);
            const name = xml.createElement("ttm:name");
            name.textContent = idName;
            agent.append(name);
            metadata.append(agent);
        }
        if (authors) { // Create a new agent for all the singers
            for (let i = 0; i < authors.length; i++) createAgent("person", `p${i + 1}`, authors[i].name)
        }
        head.append(metadata);
        root.append(head);
        const duration = document.querySelector("audio")?.duration;
        const body = xml.createElement("body");
        duration && body.setAttribute("dur", getValue(duration, true));
        /**
         * The stanza that is being edited
         */
        let div = xml.createElement("div");
        div.setAttribute("begin", getValue(finalLyrics[0].words ? finalLyrics[0].words[0].start : finalLyrics[0].start, true));
        duration && div.setAttribute("end", getValue(duration, true));
        /**
         * An Object that contains the name of the group as a key, and its ID as a value.
         */
        const addedGroups: { [key: string]: string } = {};
        /**
         * Get the name of the group
         * @param names the list of the authors that are composing this group
         * @returns the name of the group
         */
        function getFormattedGroup(names: string[]) {
            let nameBuilder = names.pop();
            if (names.length !== 0) nameBuilder = `${names.join(", ")} & ${nameBuilder}`;
            return nameBuilder;
        }
        for (let i = 0; i < finalLyrics.length; i++) {
            const item = finalLyrics[i];
            if (item.paragraphName) {
                if (i !== 0) { // The previous stanza has ended, and so we need to create a new div. We'll update the end of the current paragraph, and replace the `div` variable with a new div, that starts now.
                    const value = item.words ? item.words[0].start : item.start;
                    div.setAttribute("end", getValue(value, true))
                    body.append(div);
                    div = xml.createElement("div");
                    div.setAttribute("begin", getValue(value, true));
                    duration && div.setAttribute("end", getValue(duration, true));
                }
                div.setAttribute("itunes:songPart", item.paragraphName); // Add the stanza type
            }
            /**
             * The song line that is being edited
             */
            const p = xml.createElement("p");
            /**
             * If this line is the last one available
             */
            const isLastP = finalLyrics.length - 1 === i;
            p.setAttribute("end", getValue(!isLastP ? finalLyrics[i + 1].words ? (finalLyrics[i + 1].words as InnerLyricsStorage[])[0].start : finalLyrics[i + 1].start : item.words ? item.words[item.words.length - 1].start : item.start, true));
            if (item.words && wordByWord) { // We'll have to create a new span for each word
                p.setAttribute("begin", getValue(item.words[0].start, true));
                for (let j = 0; j < item.words.length; j++) {
                    const span = xml.createElement("span");
                    span.setAttribute("begin", getValue(item.words[j].start, true));
                    span.setAttribute("end", item.words.length - 1 !== j ? getValue(item.words[j + 1].start, true) : p.getAttribute("end") as string);
                    span.textContent = `${item.words[j].verse}${addSpace && item.words.length - 1 !== j ? " " : ""}`; // Add a space only if the user wants so (and it's not the last word of the verse)
                    if (wordParagraph) { // We need to add the singer tag in each word
                        const filteredAuthors = structuredClone(item.words[j].authors).map((arr, i) => { return { ...arr, index: i } }).filter(item => item.checked);
                        if (filteredAuthors.length === 1) { // Add a person
                            span.setAttribute("ttm:agent", `p${filteredAuthors[0].index + 1}`);
                        } else if (filteredAuthors.length > 1) { // Add a group (or create it if it doesn't exist)
                            const group = getFormattedGroup(filteredAuthors.map(item => item.name)) as string;
                            if (!addedGroups[group]) {
                                addedGroups[group] = `g${Object.keys(addedGroups).length + 1}`;
                                createAgent("group", addedGroups[group], group);
                            }
                            span.setAttribute("ttm:agent", addedGroups[group]);
                        }
                    }
                    if (item.words[j].isBackground && !item.isBackground) { // We'll need to create a container span for the text
                        const spanContainer = xml.createElement("span");
                        spanContainer.setAttribute("ttm:role", "x-bg");
                        spanContainer.append(span);
                        p.append(spanContainer);
                    } else p.append(span);
                }
            } else { // Update the text of the entire vers
                p.setAttribute("begin", getValue(item.words ? item.words[0].start : item.start, true));
                p.textContent = item.words ? item.words.map(i => i.verse).join(" ") : item.verse;
            }
            item.isBackground && p.setAttribute("ttm:role", "x-bg");
            /**
             * All the artists that sang each word in the verse.
             */
            const checkedArtists: AuthorsStorage[] = [];
            if (item.words) { // Check which artists have sang all the verse
                for (let i = 0; i < item.words[0].authors.length; i++) {
                    checkedArtists.push({ ...item.words[0].authors[i], checked: item.words.every(word => word.authors[i].checked) });
                }
            }
            if (item.words) item.authors = checkedArtists; // Update the authors list with the new fetched value
            if (item.authors && paragraphAuthor) { // If the user wants to add the singer for each verse, we'll do that. The logic is the same as the one used before for word-by-word author matching.
                const filteredAuthors = item.authors.map((a, i) => { return { ...a, index: i } }).filter(item => item.checked);
                if (filteredAuthors.length === 1) {
                    p.setAttribute("ttm:agent", `p${filteredAuthors[0].index + 1}`);
                } else if (filteredAuthors.length > 1) {
                    const group = getFormattedGroup(filteredAuthors.map(item => item.name)) as string;
                    if (!addedGroups[group]) {
                        addedGroups[group] = `g${Object.keys(addedGroups).length + 1}`;
                        createAgent("group", addedGroups[group], group);
                    }
                    p.setAttribute("ttm:agent", addedGroups[group]);
                }
            }
            div.append(p);
        }
        body.append(div);
        root.append(body);
        SaveFile({ suggestedName: `${name}.ttml`, types: [{ description: "The output TTML file", accept: { "application/xml": [".ttml"] } }], content: new Blob([new XMLSerializer().serializeToString(xml).replace(/ xmlns=\"\"/g, "")]) });
    },
    getValue
}

/**
 * Convert a number to a timestamp for LRC or TTML files.
 * @param start the number (in seconds) that should be converted
 * @param isTtml if the output string should be a TTML formatted timestamp
 * @returns a string with the formatted timestamp
 */
function getValue(start: number, isTtml?: boolean) {
    const date = new Date(Math.floor(start * 1000)); // Get value in milliseconds
    const fixDateParts = (str: string) => str.length === 1 ? `0${str}` : str;
    let ms = start.toFixed(isTtml ? 3 : 2);
    ms = ms.substring(ms.indexOf(".") + 1);
    let temp = `${fixDateParts(Math.floor((date.valueOf() - new Date(0).valueOf()) / (1000 * 60)).toString())}:${fixDateParts(date.getUTCSeconds().toString())}.${ms}`;
    if (isTtml && temp.startsWith("00:")) temp = temp.substring(3);
    if (isTtml && temp.startsWith("0")) temp = temp.substring(1);
    return temp;
}
