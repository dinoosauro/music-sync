import { useEffect, useId, useRef, useState } from "react";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import Dropdown from "./Dropdown";
import SaveFile from "../Scripts/SaveFile";
import Checkbox from "./Checkbox";
import { AuthorsStorage, InnerLyricsStorage, LyricsStorage } from "../Scripts/Interfaces";
import levenshtein from "js-levenshtein"
import ExportTools from "../Scripts/ExportTools";
import Dialog from "./Dialog";
import GearFillIcon from "../assets/gear-fill.svg"
import ZoomOut from "../assets/zoom-out.svg"
import SimpleContainer from "./SimpleContainer";
interface Props {
    /**
     * The Blob URL of the Audio file that should be played
     */
    audioUrl: string,
    /**
     * An array of each lyrics line. This value is not considered if `lrcSource` or `ttmlSource` is passed.
     */
    lyrics?: string[],
    /**
     * The name of the selected file
     */
    name?: string,
    /**
     * The original, unparsed string of the content of the LRC file
     */
    lrcSource?: string,
    /**
     * A list of the authors added by the user
     */
    authors?: AuthorsStorage[],
    /**
     * If the user should sync each word, and not each verse
     */
    wordByWordSync?: boolean,
    /**
     * If the user should choose the author of each word, and not only each verse
     */
    wordByWordAuthors?: boolean
    /**
     * The original, unparsed string of the TTML file.
     */
    ttmlSource?: string
}

/**
 * Interface used to store the checkboxes to tick/untick an author
 */
interface AuthorCheckbox {
    /**
     * An unique ID of this author
     */
    id: string,
    /**
     * The checkbox that is tied to this author
     */
    checkbox: HTMLInputElement | null
}

interface ImportAuthors extends AuthorsStorage {
    prevId?: string
}

/**
 * 
 * @param audioUrl the URL used by the HTML audio element
 * @param lyrics provide the written lyrics, so that they can be synced
 * @param name suggest a name for the output LRC file
 * @param lrcSource update the content of the lyrics sync part from a LRC file
 * @returns A ReactNode of the Audio interface. It provides only audio (with controls) if "lyrics" isn't passed. Otherwise, it provides also the sync part
 */
export default function AudioInterface({ audioUrl, lyrics, name, lrcSource, authors, wordByWordSync, wordByWordAuthors, ttmlSource }: Props) {
    /**
     * The Audio element reference
     */
    let ref = useRef<HTMLAudioElement>(null);
    /**
     * The Array that'll contain the verse and its start time
     */
    let finalLyrics = useRef<LyricsStorage[]>((lyrics ?? []).map((str, i) => {
        return {
            start: 0, verse: str, id: crypto.randomUUID(), words: wordByWordSync ? str.split(" ").map(str => {
                return {
                    start: 0,
                    verse: str,
                    index: 0,
                    id: crypto.randomUUID(),
                    authors: structuredClone(authors ?? [])
                }
            }) : undefined
        }
    }));
    /**
     * The currently selected input
     */
    let openInput = useRef<HTMLInputElement | undefined>(undefined);
    /**
     * A map of all the available inputs, and the verse number they refer to.
     */
    let inputMap = useRef<{ [key: string]: HTMLInputElement | null }>({});
    /**
     * A Map that returns all the checkboxes that depend on a Verse ID. This includes also all the checkboxes of the word authors, if word-by-word author sync is enabled.
     */
    let dropdownMap = useRef<Map<string, AuthorCheckbox[]>>(new Map());
    /**
     * A map that ties to the verse ID all the words setting buttons, so that they can be disabled if they shouldn't be used (ex: if the entire verse is in background)
     */
    let backgroundMap = useRef<Map<string, (HTMLElement | null)[]>>(new Map());
    /**
     * The div that contains all the syncing text & time, used for scrolling
     */
    let divRef = useRef<HTMLDivElement>(null);
    /**
     * If the user wants to disable automatic scrolling
     */
    let disableAutoScrolling = useRef(false);

    let [rerender, forceRerender] = useState({
        focus: "",
        update: 0
    });
    /**
     * LRC export options
     */
    const lrcExportOptions = useRef({
        /**
         * Add authors in the LRC file. They can be added following the v1: v2: v3: syntax, or the M: F: D: syntax
         */
        authors: false,
        /**
         * If the output LRC should be synced word-by-word
         */
        wordByWord: true,
        /**
         * If, instead of using the HH:MM:SS.hh, the seconds will be kept
         */
        keepSeconds: false,
        /**
         * If a new line should be added for background voices. 
         * If false, text marked as background voice in the middle of a verse will be treated as normal text.
         */
        newLineForBackground: true,
        /**
         * Add the paragraph name between square brackets in the LRC file.
         * If false, no paragraph name will be added
         */
        addParagraphName: true,
        /**
         * If the Walaoke syntax should be used for multiple authors (M: F: D:)
         */
        walaoke: false,
        /**
         * If the Walaoke syntax should be used, the first author is a male.
         */
        walaokeIsMaleFirst: true
    });
    /**
     * TTML export options
     */
    const ttmlExportOptions = useRef({
        /**
         * If the script should add the singer tag in each verse
         */
        paragraphAuthor: true,
        /**
         * If the script should add the singer tag in each word.
         * Might cause some issues on some players-
         */
        wordAuthor: false,
        /**
         * If a space should be added at the end of each word
         */
        addSpace: true,
        /**
         * If the output TTML file should be synced word-by-word
         */
        wordByWord: true
    });

    /**
     * An array of two strings that contains the IDs of the selected verse range.
     * This is used when the user wants to change the author of multiple verses
     */
    let rangeSelection = useRef<[string | undefined, string | undefined]>([undefined, undefined]);
    /**
     * An array of string IDs of the authors that should be checked in all the verses contained in the `rangeSelection`
     */
    let authorsToChange = useRef<string[]>([]);
    /**
     * The fetched authors, both from user's input and from TTML files
     */
    let authorsRef = useRef(authors);

    const [lrcExportDialogId, ttmlExportDialogId, multipleAuthorsExportId] = [useRef(useId()), useRef(useId()), useRef(useId())];

    useEffect(() => {
        if (finalLyrics.current.length !== 0) { // Set up lyrics-specific events
            // Focus the first element
            let newInput = inputMap.current[Object.keys(inputMap)[0]] as HTMLInputElement | undefined;
            newInput && changeInput(newInput);
            ref.current && ref.current.addEventListener("timeupdate", () => { // Add event to the Audio event, when playback time changes
                if (disableAutoScrolling.current) return;
                const minorItems = finalLyrics.current.map((e, i) => { return { ...e, index: i } }).filter(lyric => (lyric.words ? lyric.words[0].start : lyric.start) !== 0 && (lyric.words ? lyric.words[0].start : lyric.start) < (ref.current?.currentTime ?? 0)); // Gets the verses that come after the current timestamp
                const entry = minorItems[minorItems.length - 1];
                if (!entry) return;
                let outputId = entry.id;
                if (entry.words) { // Get the specific word that should be highlighted
                    const word = entry.words.filter(lyric => lyric.start < (ref.current?.currentTime ?? 0) && lyric.start !== 0);
                    outputId = word[word.length - 1].id;
                }
                const selectedItem = inputMap.current[outputId]; // Find the last item that has passed
                selectedItem && selectedItem !== openInput.current && changeInput(selectedItem); // If it's not the same that's focused, update it
            })
        }
    }, [])
    /**
     * Parse the source arguments so that a `finalLyrics` object array can be created.
     * This function handles line-by-line authors, LRC files and TTML files.
     */
    function parseSourceFile() {
        if (authors) {
            for (let i = 0; i < finalLyrics.current.length; i++) finalLyrics.current[i].authors = structuredClone(authors);
        }
        if (lrcSource) { // Map a LRC file by adding also the number of seconds alongside with each verse
            const split = lrcSource.split("\n");
            for (let i = 0; i < split.length; i++) {
                const line = split[i];
                if (!line.match(/^\[\d+:\d{2}\.\d+\]/)) continue; // Check LRC syntax
                /**
                 * Convert the LRC timestamp to seconds
                 * @param startLineArr the string array of LRC timestamps, divided both by : and by <div className=""></div>
                 * @returns the seconds where the line/word starts
                 */
                function parseValue(startLineArr: string[]) {
                    return (+startLineArr[0] * 60) + (+startLineArr[1]) + (+startLineArr[2] / 100);
                }
                /**
                 * The array of words object
                 */
                let wordsArr: InnerLyricsStorage[] | undefined = undefined;
                if (!finalLyrics.current[i]) finalLyrics.current[i] = { start: 0, id: crypto.randomUUID(), verse: "" }; // Create a new placeholder value for the current lyrics
                finalLyrics.current[i].start = parseValue(line.substring(1, line.indexOf("]")).split(/[:.]+/)); // Split both for ":" and for "."
                let finalText = line.substring(line.indexOf("]") + 1);
                /**
                 * - If 0, no duet is available;
                 * - If 1, the main author is singing;
                 * - If 2, the second author is singing;
                 * - If 3, a group of people is singing
                 */
                let duetType = 0;
                if (finalText.startsWith("v1:") || finalText.startsWith("M:")) duetType = 1;
                if (finalText.startsWith("v2:") || finalText.startsWith("F:")) duetType = 2;
                if (finalText.startsWith("v3:") || finalText.startsWith("D:")) duetType = 3;
                if (finalText.startsWith("v1:") || finalText.startsWith("v2:") || finalText.startsWith("v3:")) finalText = finalText.substring(finalText.indexOf(":") + 1).trim();
                if (line.indexOf("<") !== -1 && line.indexOf(">") !== -1 && wordByWordSync) { // Word-by-word lyrics found: let's add them
                    wordsArr = [];
                    /**
                     * Get if the text is in an even position or in an odd position
                     */
                    let textPosition = finalText.indexOf("<") === 0 ? 1 : 0;
                    const text = finalText.split(/[<>]+/).map(i => i.trim());
                    if (text[0] === "") text.shift();
                    if (text.length % 2 !== 0) text.push("");
                    const newAuthors = structuredClone(authors ?? []);
                    if ((duetType === 1 || duetType === 3) && newAuthors.length > 0) newAuthors[0].checked = true; // Set authors checked
                    if ((duetType === 2 || duetType === 3) && newAuthors.length > 1) newAuthors[1].checked = true; // Set authors checked
                    for (let i = 0; i < text.length; i += 2) { // Now let's add each word
                        wordsArr.push({
                            verse: text[i + textPosition],
                            start: parseValue(text[textPosition === 1 ? i : i + 1].split(/[:.]+/)),
                            authors: authors ? newAuthors : [],
                            id: crypto.randomUUID(),
                        });
                    }
                } else if (wordByWordSync) { // The user wants to sync the text word-by-word, but the LRC file doesn't contain them. So, we have to split the text 
                    wordsArr = [];
                    let textSplit = finalText.split(" ");
                    for (const text of textSplit) wordsArr.push({
                        verse: text,
                        start: finalLyrics.current[i].start,
                        authors: authors ? structuredClone(authors ?? []) : [],
                        id: crypto.randomUUID()
                    })
                } else { // Let's just add the text, replacing the word-by-word sign with nothing (since the user doesn't want to sync word-by-word lyrics)
                    finalText = finalText.replace(/<[^>]*>/g, "");
                }
                finalLyrics.current[i].verse = !wordsArr ? finalText : wordsArr.map(i => i.verse).join(" ");
                if (authors) { // Add authors to the single verse (not to the words; that has already been done before)
                    const newAuthors = structuredClone(authors ?? []);
                    if ((duetType === 1 || duetType === 3) && newAuthors.length > 0) newAuthors[0].checked = true;
                    if ((duetType === 2 || duetType === 3) && newAuthors.length > 1) newAuthors[1].checked = true;
                    finalLyrics.current[i].authors = newAuthors.length === 0 ? undefined : newAuthors;
                }
                finalLyrics.current[i].words = wordsArr;
            }
        };
        if (ttmlSource) { // Parse TTML lyrics
            try {
                const parser = new DOMParser().parseFromString(ttmlSource, "application/xml");
                /**
                 * The authors, both the ones that have been added by the user and the ones that have been fetched by the user.
                 */
                const ttmlAuthors: ImportAuthors[] = structuredClone(authors ?? []);
                /**
                 * The groups that have been found in the TTML file
                 */
                const tempTtmlGroups: AuthorsStorage[] = [];

                for (const item of parser.getElementsByTagName("ttm:agent")) { // Let's check all the authors/groups. Note that we need to use `getElementsByTagName` since using `querySelector` would throw an error since : is not supported in its syntax.
                    const possibleNames = item.getElementsByTagName("ttm:name"); // Let's get the possible name of the author. Many times this isn't provided, so it could probably be undefined.
                    const possibleName = possibleNames.length === 0 ? undefined : possibleNames[0];
                    if (item.getAttribute("type") === "group") { // Let's add the group to the array. We are sure this is unique, since the user can't choose groups from the UI
                        tempTtmlGroups.push({ name: possibleName?.textContent ?? crypto.randomUUID(), id: item.getAttribute("xml:id") ?? crypto.randomUUID() });
                    } else { // Let's get the author, and add it.
                        if (possibleName && possibleName.textContent) {
                            const textToLook = possibleName.textContent.toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
                            const possibleMatch = ttmlAuthors.find(i => levenshtein(i.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, ""), textToLook as string) < 5); // Let's
                            if (possibleMatch) possibleMatch.prevId = item.getAttribute("xml:id") ?? undefined; else ttmlAuthors.push({ id: `p${ttmlAuthors.length + 1}`, name: possibleName?.textContent, prevId: item.getAttribute("xml:id") ?? undefined });
                        } else ttmlAuthors.push({ id: `p${ttmlAuthors.length + 1}`, name: `Author ${ttmlAuthors.length + 1}`, prevId: item.getAttribute("xml:id") ?? undefined }); // Let's add a temp author name
                    }
                }
                authors = structuredClone(ttmlAuthors); // We can change the authors prop for now, since after this gigant if block we'll update the authorsRef
                /**
                 * Convert TTML timestamps to seconds.
                 * @param str the time string splitted by : and .
                 * @returns the seconds where the verse/word starts
                 */
                function convertToSeconds(str: string[]) {
                    if (str[str.length - 1].endsWith("s")) return +str.join(".").replace("s", ""); // The timestamp is already specified in seconds. How lucky we are.
                    let hours = str.length === 4 ? +str[0] * 3600 : 0;
                    let minutes = str.length >= 3 ? +str[str.length === 4 ? 1 : 0] * 60 : 0;
                    let seconds = +str[str.length === 4 ? 2 : str.length === 3 ? 1 : 0];
                    let ms = +`0.${str[str.length - 1]}0000`; // The last 0s are totally unnecessary, but probably I was too tired when I wrote this.
                    return hours + minutes + seconds + ms;
                }
                /**
                 * Obtain the Authors of a verse/word
                 * @param item the Element where the agent element should be fetched
                 * @returns the Authors object ot add to the current verse/word
                 */
                function checkAuthor(item: Element) {
                    const authors = structuredClone(ttmlAuthors);
                    const agent = item.getAttribute("ttm:agent");
                    if (!agent) return authors; // No author found
                    const getAuthorId = authors.findIndex((item, i) => (item.prevId ?? `p${i + 1}`) === agent); // Let's get the author
                    if (getAuthorId === -1) { // No author found. Let's look if it's a group
                        const possibleGroup = tempTtmlGroups.find(item => item.id === agent);
                        if (possibleGroup) { // Now we have to find the authors. We'll look if the group name contains it.
                            const name = possibleGroup.name.replace(/[^a-zA-Z0-9]/g, "");
                            let updated = false;
                            for (let i = 0; i < authors.length; i++) {
                                if (name.indexOf(authors[i].name.replace(/[^a-zA-Z0-9]/g, "")) !== -1) {
                                    authors[i].checked = true;
                                    updated = true;
                                }
                            }
                            if (!updated && authors.length === 2) { // If we couldn't find any authors' name, but we know there are only two, we can confidently tell that both people are singing.
                                for (let i = 0; i < authors.length; i++) authors[i].checked = true;
                            }
                        }
                    } else authors[getAuthorId].checked = true;
                    return authors;
                }
                for (const paragraph of parser.querySelectorAll("p")) { // Now let's get all the paragraphs, and let's parse them
                    const paragraphStart = paragraph.getAttribute("begin");
                    if (!paragraphStart) continue; // We don't know when this paragraph starts, so let's skip it.
                    const lyrics: LyricsStorage = {
                        id: crypto.randomUUID(),
                        verse: paragraph?.textContent ?? "",
                        start: convertToSeconds(paragraphStart.split(/[:.]+/)),
                        authors: ttmlAuthors.length === 0 ? undefined : checkAuthor(paragraph),
                        isBackground: paragraph.getAttribute("ttm:role") === "x-bg" || undefined,
                        paragraphName: paragraph.parentElement?.firstElementChild === paragraph ? paragraph?.parentElement.getAttribute("itunes:songPart") ?? undefined : undefined
                    }
                    const spans = Array.from(paragraph.children).filter(i => i.tagName.toLowerCase() === "span");
                    if (spans.length !== 0) {  // Word-by-word lyrics
                        const words: InnerLyricsStorage[] = [];
                        for (let span of spans) {
                            // If a span is set to be in background, it doesn't directly contain the text, but actually contains a span with the text. So we need to check if the first span has this attribute, and later we'll get the last span in the node tree.
                            let isBackground = span.getAttribute("ttm:role") === "x-bg";
                            while (span.querySelector("span")) {
                                span = span.querySelector("span") as HTMLSpanElement;
                                if (!isBackground) isBackground = span.getAttribute("ttm:role") === "x-bg";
                            }
                            const spanStart = span.getAttribute("begin");
                            if (!spanStart || !span.textContent) continue;
                            words.push({
                                id: crypto.randomUUID(),
                                verse: span.textContent.trim(),
                                start: convertToSeconds(spanStart.split(/[:.]+/)),
                                authors: checkAuthor(span),
                                isBackground: isBackground || undefined
                            });
                        }
                        if (wordByWordSync) lyrics.words = words;
                        if (lyrics.authors) { // Now let's check the author of each word. If it's the same for all the words in the verse, we'll mark also the authors in the verse as checked.
                            for (const author of lyrics.authors) {
                                if (words.every(item => item.authors.find(i => i.id === author.id)?.checked)) (lyrics.authors.find(i => i.id === author.id) as AuthorsStorage).checked = true;
                            }
                        }
                        lyrics.verse = words.map(i => i.verse.trim()).join(" ");
                    }
                    if (lyrics.words) { // And let's do the opposite: if an author is singing the entire verse, we need to set also all the words as sang by them.
                        for (const author of (lyrics.authors ?? [])) {
                            if (author.checked) {
                                for (let i = 0; i < lyrics.words.length; i++) lyrics.words[i].authors[lyrics.words[i].authors.findIndex(i => i.id === author.id)].checked = true;
                            }
                        }
                    }
                    finalLyrics.current.push(lyrics);
                }
                authorsRef.current = authors;
            } catch (ex) {
                console.warn(ex);
            }
        }
    }

    let hasSourceFileBeenParsed = useRef(false);
    if (!hasSourceFileBeenParsed.current) {
        parseSourceFile();
        hasSourceFileBeenParsed.current = true;
    }
    /**
     * Get the text of the verse, by joining the words of the `words` array if available. 
     * The verse is used as a fallback value.
     * This is done since the user can add and change multiple words, and these changes aren't applied in the `verse` line string.
     * @param verse the original verse
     * @param words if available, the single words that compose the verse
     * @returns the actual verse
     */
    function getText(verse: string, words?: InnerLyricsStorage[]) {
        if (words) return words.map(i => i.verse).join(" ");
        return verse;
    }
    useEffect(() => { // Every time we need to change the focused element via the State, this function is triggered
        if (rerender.focus !== "") {
            const input = inputMap.current[rerender.focus];
            if (input) {
                changeInput(input);
                (input.parentElement?.nextSibling?.firstChild as HTMLInputElement)?.focus();
            }
        }
    }, [rerender.focus])
    /**
     * Make a new input element focused
     * @param input the input that'll become the new focused element
     */
    function changeInput(input: HTMLInputElement) {
        if (openInput.current) openInput.current.style.backgroundColor = "";
        openInput.current = input;
        openInput.current.style.backgroundColor = "var(--bs-warning-border-subtle)";
        divRef.current && divRef.current.scrollTo({ top: (input.getBoundingClientRect().top - divRef.current.getBoundingClientRect().top + divRef.current.scrollTop - (2 * input.clientHeight)), behavior: "smooth" });
    }
    /**
     * Get the settings of that specific verse
     * @param position the position in the array the Dropdown will edit
     * @param verse the `finalLyrics` object it refers to
     * @returns the ReactNode of the verse settings
     */
    function CreateSettingsDropdown(position: number, verse: LyricsStorage) {
        return <Dropdown center={true} btnColor="secondary" dropdownWidth="50vw" title={<img src={GearFillIcon} style={{ width: "20px", height: "20px" }}></img>}>
            <p>If this is the start of a new stanza, write its type (ex: <code>Chorus</code>) here below. Otherwise, leave it blank.</p>
            <Input hint="Paragraph type" defaultVal={finalLyrics.current[position].paragraphName ?? ""} type="text" update={(text) => { finalLyrics.current[position].paragraphName = text === "" ? undefined : text }}></Input>
            <Checkbox text="This verse should be in the background" defaultChecked={finalLyrics.current[position].isBackground} change={(e) => {
                finalLyrics.current[position].isBackground = e;
                // Let's mark all the single word option buttons as disabled
                for (const btn of (backgroundMap.current.get(verse.id) ?? [])) e ? btn?.querySelector("button")?.setAttribute("disabled", "true") : btn?.querySelector("button")?.removeAttribute("disabled");
            }}></Checkbox><br></br>
            {verse.authors && <>
                <p>If you want to change the authors of multiple rows, click the button below. Then, close this dropdown, go to the last element you want to change, open its settings and click again on the button. We'll ask you to choose the authors to select.</p>
                <Button click={() => {
                    if (rangeSelection.current[1]) rangeSelection.current = [undefined, undefined];
                    if (!rangeSelection.current[0]) rangeSelection.current[0] = verse.id; else {
                        rangeSelection.current[1] = verse.id;
                        new window.bootstrap.Modal(document.getElementById(multipleAuthorsExportId.current) as HTMLElement).show();
                    }
                }}>Change multiple items</Button>
            </>}
        </Dropdown>
    }
    return <><Card header="Audio controls">
        <audio controls ref={ref} src={audioUrl} autoPlay={true} style={{ width: "100%", borderRadius: "8px" }}></audio><br></br><br></br>
        <div className="btn-group" role="group">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4].map(speed => <Button type="secondary" click={() => {
                if (ref.current) ref.current.playbackRate = speed;
            }} key={`MusicSync-PlaybackRate-${speed}`}>{speed}</Button>)}
            <input type="number" className="form-control" step={0.25} onInput={(e) => {
                if (ref.current) ref.current.playbackRate = +(e.target as HTMLInputElement).value;
            }}></input>
        </div>
    </Card>
        {(finalLyrics.current.length !== 0) && <><br></br><br></br>
            <Card header="Sync lyrics:">
                <Button click={() => {
                    if (openInput.current && ref.current) {
                        const entries = Object.entries(inputMap.current);
                        let position = (openInput.current.parentElement?.parentElement?.nextSibling as HTMLElement)?.querySelector("input[type=number]"); // Go to the next position
                        if (!position) position = (openInput.current.parentElement?.parentElement?.nextSibling?.nextSibling as HTMLElement)?.querySelector("input[type=number]"); // If the user is in the word-by-word lyrics edit mode, the table row might contain a strong with the verse text instead of the real text. So, in that case we need to get the next element
                        let nextInput = entries.find(([item, element]) => element === position); // And find the next item
                        if (nextInput && nextInput[1]) { // If the next item exists
                            nextInput[1].value = (ref.current.currentTime).toString(); // Since the PREVIOUS LINE ENDS here, the start value of the next item will be now.
                            if (finalLyrics.current[finalLyrics.current.findIndex(item => item.id === nextInput[0] || item.words?.findIndex(item2 => item2.id === nextInput[0]))].words) { // If the `finalLyrics` object the textbox is tied to has some words, we need to change that specific value
                                const firstIndex = finalLyrics.current.findIndex(item => item.words?.find(e => e.id === nextInput[0]));
                                if (firstIndex !== -1) {
                                    const secondIndex = finalLyrics.current[firstIndex].words?.findIndex(e => e.id === nextInput[0]) ?? -1;
                                    if (finalLyrics.current[firstIndex].words) finalLyrics.current[firstIndex].words[secondIndex].start = ref.current.currentTime;
                                }
                            } else finalLyrics.current[finalLyrics.current.findIndex(item => item.id === nextInput[0])].start = ref.current.currentTime; // We just need to change the start line author
                            // Find the next input so that it can be focused
                            let openParent = openInput.current.parentElement?.parentElement as HTMLDivElement;
                            openParent = openParent.nextElementSibling as HTMLDivElement;
                            // Now let's select the next textbox
                            if (!openParent.querySelector("input[type=number]")) openParent = openParent.nextElementSibling as HTMLDivElement;
                            if (openParent) changeInput(openParent.querySelector("input[type=number]") as HTMLInputElement); else {
                            }
                        }
                    }
                }}>This line ends here</Button>
                <span style={{ marginLeft: "10px" }}></span>
                <Button type="info" click={() => {
                    if (openInput.current && ref.current) {
                        // Update the time of the items so that the CURRENT ITEM STARTS NOW. The structure basically is the same as above.
                        const entries = Object.entries(inputMap.current);
                        const position = entries[entries.findIndex(item => item[1] === openInput.current)]; // Go to the next position
                        if (!position) return;
                        openInput.current.value = (ref.current.currentTime).toString();
                        if (finalLyrics.current[finalLyrics.current.findIndex(item => item.id === position[0] || item.words?.findIndex(item2 => item2.id === position[0]))].words) { // If the `finalLyrics` object the textbox is tied to has some words, we need to change that specific value
                            const firstIndex = finalLyrics.current.findIndex(item => item.words?.find(e => e.id === position[0]));
                            if (firstIndex !== -1) {
                                const secondIndex = finalLyrics.current[firstIndex].words?.findIndex(e => e.id === position[0]) ?? -1;
                                if (finalLyrics.current[firstIndex].words) finalLyrics.current[firstIndex].words[secondIndex].start = ref.current.currentTime;
                            }
                        } else finalLyrics.current[finalLyrics.current.findIndex(item => item.id === position[0])].start = ref.current.currentTime; // We just need to change the start line author
                        // Find the next input so that it can be focused
                        let openParent = openInput.current.parentElement?.parentElement as HTMLDivElement;
                        openParent = openParent.nextElementSibling as HTMLDivElement;
                        // Now let's select the next textbox
                        if (!openParent.querySelector("input[type=number]")) openParent = openParent.nextElementSibling as HTMLDivElement;
                        if (openParent) changeInput(openParent.querySelector("input[type=number]") as HTMLInputElement);
                    }
                }}>This line starts here</Button>
                <span style={{ marginLeft: "10px" }}></span>
                <Dropdown title="Export">
                    <li><a className="dropdown-item" onClick={() => {
                        if (!authorsRef.current && !wordByWordSync) ExportTools.toLRC({ finalLyrics: structuredClone(finalLyrics.current), name }); else new window.bootstrap.Modal(document.getElementById(lrcExportDialogId.current) as HTMLElement).show();
                    }}>Export as a LRC</a></li>
                    <li><a className="dropdown-item" onClick={() => {
                        if (!authorsRef.current && !wordByWordSync) ExportTools.toTTML({ authors: authorsRef.current, finalLyrics: structuredClone(finalLyrics.current), name }); else new window.bootstrap.Modal(document.getElementById(ttmlExportDialogId.current) as HTMLElement).show()
                    }}>Export as a TTML</a></li>
                    <li><a className="dropdown-item" onClick={() => { // Download the JSON conversion of the "finalLyrics.current" array
                        SaveFile({ suggestedName: `${name}-Synced.json`, types: [{ description: "The output JSON file", accept: { "application/json": [".json"] } }], content: new Blob([JSON.stringify(finalLyrics.current)]) });
                    }}>Download JSON file</a></li>
                    <li><a className="dropdown-item" onClick={() => { // Download only the lyrics
                        const outputStr = finalLyrics.current.map(({ verse, words }) => getText(verse, words)).join("\n");
                        SaveFile({ suggestedName: `${name}-Lyrics.txt`, types: [{ description: "The output TXT file, with only the lyrics", accept: { "text/plain": [".txt"] } }], content: new Blob([outputStr]) });
                    }}>Download only lyrics</a></li>
                    <li><a className="dropdown-item" onClick={() => { // Download only the synced seconds
                        const outputStr = finalLyrics.current.map(({ start, words }) => words ? words[0].start : start).join("\n");
                        SaveFile({ suggestedName: `${name}-VersePosition.txt`, types: [{ description: "The output TXT file, with only the position of the verses", accept: { "text/plain": [".txt"] } }], content: new Blob([outputStr]) });
                    }}>Download only verse position</a></li>
                </Dropdown>
                <Dialog id={ttmlExportDialogId.current} title="TTML Export settings" actionBtn={{
                    text: "Save TTML file",
                    callback: () => {
                        ExportTools.toTTML({ authors: authorsRef.current, finalLyrics: structuredClone(finalLyrics.current), name, paragraphAuthor: ttmlExportOptions.current.paragraphAuthor, wordParagraph: ttmlExportOptions.current.wordAuthor, addSpace: ttmlExportOptions.current.addSpace, wordByWord: ttmlExportOptions.current.wordByWord });
                        window.bootstrap.Modal.getInstance(document.getElementById(ttmlExportDialogId.current) as HTMLElement)?.hide();
                    }
                }}>
                    <Checkbox defaultChecked={ttmlExportOptions.current.paragraphAuthor} change={(e) => { ttmlExportOptions.current.paragraphAuthor = e }} text="Add the singer in the metadata of each line"></Checkbox><br></br>
                    {wordByWordSync && <>
                        <Checkbox defaultChecked={ttmlExportOptions.current.wordAuthor} change={(e) => { ttmlExportOptions.current.wordAuthor = e }} text="Add the singer name in the metadata of each word (might bring compatibilty issues)"></Checkbox><br></br>
                        <Checkbox defaultChecked={ttmlExportOptions.current.addSpace} change={(e) => { ttmlExportOptions.current.addSpace = e }} text="Add a space in all the spans"></Checkbox><br></br>
                        <Checkbox defaultChecked={ttmlExportOptions.current.wordByWord} change={(e) => { ttmlExportOptions.current.wordByWord = e }} text="Export a word-by-word synced TTML file"></Checkbox><br></br>
                    </>}
                </Dialog>
                <Dialog actionBtn={{
                    text: "Save LRC file",
                    callback: () => {
                        ExportTools.toLRC({ finalLyrics: finalLyrics.current, name, keepAuthors: lrcExportOptions.current.authors, keepWordByWord: lrcExportOptions.current.wordByWord, keepSeconds: lrcExportOptions.current.keepSeconds, putBackgroundInNewLine: lrcExportOptions.current.newLineForBackground, addParagraphName: lrcExportOptions.current.addParagraphName, walaoke: lrcExportOptions.current.walaoke, walaokeIsMaleFirst: lrcExportOptions.current.walaokeIsMaleFirst }) // Save the lyrics by keeping the value of each number input (and therefore with seconds)
                        window.bootstrap.Modal.getInstance(document.getElementById(lrcExportDialogId.current) as HTMLElement)?.hide();
                    }
                }} id={lrcExportDialogId.current} title="LRC Export settings">
                    <Checkbox defaultChecked={lrcExportOptions.current.authors} change={(e) => { lrcExportOptions.current.authors = e }} text="Add singer/group indication in the LRC file"></Checkbox><br></br>
                    {wordByWordSync && <><Checkbox defaultChecked={lrcExportOptions.current.wordByWord} change={(e) => lrcExportOptions.current.wordByWord = e} text="Export a word-by-word LRC file"></Checkbox><br></br></>}
                    <Checkbox defaultChecked={lrcExportOptions.current.keepSeconds} change={(e) => { lrcExportOptions.current.keepSeconds = e }} text="Keep the seconds instead of using the standard HH:MM:ss format of the LRC files. [Suggested: false]"></Checkbox><br></br>
                    <Checkbox defaultChecked={lrcExportOptions.current.newLineForBackground} change={(e) => { lrcExportOptions.current.newLineForBackground = e; }} text="If only part of the verse is a background voice, put the background voice in a new line. If disabled, midline background voices will be discarded from LRC files."></Checkbox><br></br>
                    <Checkbox defaultChecked={lrcExportOptions.current.addParagraphName} change={(e) => { lrcExportOptions.current.addParagraphName = e; }} text="If set, add the paragraph name also in the LRC file (in square brackets)"></Checkbox><br></br>
                    <Checkbox defaultChecked={lrcExportOptions.current.walaoke} change={(e) => { lrcExportOptions.current.walaoke = e; }} text="Use Walaoke gender extension for multiple authors"></Checkbox><br></br>
                    <Checkbox defaultChecked={lrcExportOptions.current.walaokeIsMaleFirst} change={(e) => { lrcExportOptions.current.walaokeIsMaleFirst = e; }} text="If Walaoke gender extension is used, the first singer is male"></Checkbox><br></br>
                </Dialog>
                <Dialog id={multipleAuthorsExportId.current} title="Multiple authors selection" actionBtn={{
                    text: "Apply",
                    callback: () => {
                        let foundFirst;
                        for (let i = 0; i < finalLyrics.current.length; i++) { // We'll iterate over all the finalLyrics entries.
                            if (!foundFirst && finalLyrics.current[i].id !== rangeSelection.current[0] && finalLyrics.current[i].id !== rangeSelection.current[1]) continue;
                            // Let's look at the verse authors, and set them checked if their ID is contained in the `authorsToChange` array. Otherwise, they'll be marked as not checked.
                            if (finalLyrics.current[i].authors) {
                                for (let j = 0; j < (finalLyrics.current[i].authors as AuthorsStorage[]).length; j++) {
                                    (finalLyrics.current[i].authors as AuthorsStorage[])[j].checked = authorsToChange.current.includes((finalLyrics.current[i].authors as AuthorsStorage[])[j].id);
                                }
                            }
                            if (finalLyrics.current[i].words) { // We also need to change the authors of each word. We'll do the same as before, just with an extra for loop :D
                                for (let j = 0; j < (finalLyrics.current[i].words as InnerLyricsStorage[]).length; j++) {
                                    for (let k = 0; k < (finalLyrics.current[i].words as InnerLyricsStorage[])[j].authors.length; k++) {
                                        (finalLyrics.current[i].words as InnerLyricsStorage[])[j].authors[k].checked = authorsToChange.current.includes((finalLyrics.current[i].words as InnerLyricsStorage[])[j].authors[k].id);
                                    }
                                }
                            }
                            for (const checkbox of (dropdownMap.current.get(finalLyrics.current[i].id) ?? [])) { // And now we also need to set the checkboxes checked.
                                if (checkbox.checkbox) checkbox.checkbox.checked = authorsToChange.current.includes(checkbox.id);
                            }

                            if (foundFirst && (finalLyrics.current[i].id === rangeSelection.current[0] || finalLyrics.current[i].id === rangeSelection.current[1])) break; // This is the last element of the selection
                            foundFirst = true; // Let's add it after this check so that it won't be triggered the first time
                        }
                        window.bootstrap.Modal.getInstance(document.getElementById(multipleAuthorsExportId.current) as HTMLElement)?.hide();
                    }
                }}>
                    <p>Pick the author(s) that sang this range:</p>
                    {(authorsRef.current ?? []).map((item) => <><Checkbox text={item.name} change={(e) => {
                        e ? authorsToChange.current.push(item.id) : authorsToChange.current.splice(authorsToChange.current.findIndex(e => e === item.id), 1);
                    }}></Checkbox><br></br></>)}
                </Dialog>
                <Checkbox text={<span>Disable auto scrolling</span>} change={(checked) => disableAutoScrolling.current = checked}></Checkbox>
                <br></br><br></br>
                <div style={{ height: "40vh", overflow: "auto" }} ref={divRef} key={rerender.update}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th scope="col">Start</th>
                                <th scope="col">Lyrics</th>
                                {authorsRef.current && wordByWordAuthors && <th scope="col">Author:</th>}
                            </tr>
                            {finalLyrics.current.map((verse, position) =>
                                verse.words ? <SimpleContainer key={`MusicSync-AudioTextWrapper-${verse.id}`}>
                                    <>
                                    <tr key={`MusicSync-AudioTextContainer-${verse.id}`}>
                                        <td>
                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                {CreateSettingsDropdown(position, verse)}
                                                <strong style={{ textAlign: "center" }}>{verse.verse}</strong>
                                            </div>
                                        </td>
                                        {authorsRef.current && wordByWordAuthors && <td></td>}
                                        {verse.authors && <td>
                                            <Dropdown title="Pick authors (entire line)">
                                                {verse.authors.map((author, i) => <li>
                                                    <div className="formCheck">
                                                        <div className="form-check">
                                                            <input defaultChecked={(verse.authors as AuthorsStorage[])[i].checked} className="form-check-input" ref={input => {
                                                                // Let's tie this checkbox to the verse ID, so that it can be programmatically changed later without triggering a re-render
                                                                const arr = dropdownMap.current.get(verse.id);
                                                                if (!arr) dropdownMap.current.set(verse.id, [{ checkbox: input, id: author.id }]); else {
                                                                    arr.push({ checkbox: input, id: author.id });
                                                                    dropdownMap.current.set(verse.id, arr);
                                                                }
                                                            }} type="checkbox" onChange={(e) => {
                                                                // Let's mark this author as checked/unchecked for all the single words
                                                                for (let j = 0; j < (finalLyrics.current[position].words as InnerLyricsStorage[]).length; j++) {
                                                                    (finalLyrics.current[position].words as InnerLyricsStorage[])[j].authors[(finalLyrics.current[position].words as InnerLyricsStorage[])[j].authors.findIndex(i => i.id === author.id)].checked = e.target.checked;
                                                                }
                                                                // And update all the checkboxes of the single words
                                                                for (const checkbox of (dropdownMap.current.get(verse.id) ?? [])) {
                                                                    if (author.id === checkbox.id && checkbox.checkbox) checkbox.checkbox.checked = e.target.checked;
                                                                }
                                                            }}></input><label className="form-check-label">{author.name}</label>
                                                        </div>
                                                    </div>
                                                </li>)}
                                            </Dropdown>
                                        </td>}
                                    </tr>
                                    {verse.words.map((word, wordPosition) =>
                                        <tr key={`MusicSync-Audio-${position}-${word.id}`}>
                                            <td style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <span ref={ref => {
                                                    // Let's add this single word setting button to the list
                                                    const prev = backgroundMap.current.get(verse.id) ?? [];
                                                    prev.push(ref);
                                                    backgroundMap.current.set(verse.id, prev);
                                                }}>
                                                    <Dropdown disabled={finalLyrics.current[position].isBackground} center={true} btnColor="outline-secondary" title={<img src={ZoomOut} style={{ width: "20px", height: "20px" }}></img>}>
                                                        <Checkbox text="This word should be in the background" defaultChecked={(finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].isBackground} change={(e) => { (finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].isBackground = e }}></Checkbox>
                                                    </Dropdown>
                                                </span>
                                                <input step={0.03} ref={el => {
                                                    inputMap.current[word.id] = el;
                                                }} onClick={(e) => {
                                                    if (ref.current) ref.current.currentTime = +(e.target as HTMLInputElement).value; // Go back to the start of the element
                                                    changeInput(e.target as HTMLInputElement); // And make it focused also for the rest of the script
                                                }} className="form-control" onChange={(e) => {
                                                    (finalLyrics.current[position].words as LyricsStorage[])[wordPosition].start = +(e.target as HTMLInputElement).value; // Update the start value of the finalLyrics.current array
                                                    if (ref.current) ref.current.currentTime = +(e.target as HTMLInputElement).value; // And also update the value of the Audio element
                                                }} type="number" defaultValue={word.start ?? 0}></input></td>
                                            <td><input onKeyDown={({ key }) => {
                                                if (key === "Enter") { 
                                                    // We need to create a new line. We'll start by getting the words that should go to a new line, and then we'll build the new object
                                                    const wordPosition = finalLyrics.current[position].words?.findIndex(i => i.id === word.id) ?? 0;
                                                    const newWords = (finalLyrics.current[position].words as InnerLyricsStorage[]).splice(wordPosition + 1);
                                                    finalLyrics.current[position].verse = (finalLyrics.current[position].words as InnerLyricsStorage[]).map(i => i.verse).join(" ");
                                                    const newId = crypto.randomUUID();
                                                    const start = (ref.current && !ref.current.paused) ? ref.current.currentTime : newWords.length === 0 ? (finalLyrics.current[position].words as InnerLyricsStorage[])[(finalLyrics.current[position].words as InnerLyricsStorage[]).length - 1].start : newWords[0].start; // Let's get the start of the new verse
                                                    finalLyrics.current.splice(position + 1, 0, {
                                                        words: newWords.length === 0 ? [{
                                                            verse: "",
                                                            id: newId,
                                                            authors: structuredClone(finalLyrics.current[position].authors ?? []),
                                                            start
                                                        }] : newWords,
                                                        verse: newWords.map(i => i.verse).join(" "),
                                                        authors: structuredClone(finalLyrics.current[position].authors ?? []),
                                                        id: crypto.randomUUID(),
                                                        start
                                                    });
                                                    forceRerender(prev => Object.assign({}, { focus: (verse.words as InnerLyricsStorage[])[Math.max(0, wordPosition - 1)].id, update: prev.update + 1 })); // Here I remembered that Object.assign existed, so I used that because... idk, because that looked fancy I guess.
                                                }
                                            }} className="form-control" onChange={(e) => {
                                                // We need to check if the user has added a new space. In this case, we need to create a new textbox
                                                let splitText = e.target.value.split(" ");
                                                if (splitText.length === 1 && splitText[0] === "") splitText = []; // Actually, the user has deleted the current textbox.
                                                const wordPosition = finalLyrics.current[position].words?.findIndex(i => i.id === word.id) ?? 0;
                                                switch (splitText.length) {
                                                    case 0: { // Delete the current word
                                                        if (finalLyrics.current[position].words?.length === 1) { // We need to delete the entire line
                                                            finalLyrics.current.splice(position, 1);
                                                            forceRerender(prev => Object.assign({}, { focus: (finalLyrics.current[position] ? finalLyrics.current[position].words ? finalLyrics.current[position].words[0].id : finalLyrics.current[position].id : finalLyrics.current[position - 1].id ), update: prev.update + 1 }));
                                                        } else {
                                                            finalLyrics.current[position].words?.splice(wordPosition, 1);
                                                            forceRerender(prev => Object.assign({}, { focus: (verse.words as InnerLyricsStorage[])[Math.max(0, wordPosition - 1)].id, update: prev.update + 1 }));
                                                        }
                                                        break;
                                                    }
                                                    case 1: { // We just need to update the verse content
                                                        (finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].verse = (e.target as HTMLInputElement).value;
                                                        break;
                                                    }
                                                    default: { // We need to create a new line
                                                        const currentText = splitText.shift();
                                                        (finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].verse = currentText as string;
                                                        const id = crypto.randomUUID();
                                                        finalLyrics.current[position].words?.splice(wordPosition + 1, 0, ...splitText.map(i => {
                                                            return {
                                                                start: (finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].start,
                                                                verse: i,
                                                                id,
                                                                authors: structuredClone((finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].authors)
                                                            }
                                                        }));
                                                        e.target.value = currentText as string;
                                                        forceRerender(prev => Object.assign({}, { focus: id, update: prev.update + 1 }));
                                                        break;
                                                    }
                                                }
                                            }} type="text" defaultValue={(verse.words as LyricsStorage[])[wordPosition].verse ?? verse}></input></td>
                                            {authorsRef.current && wordByWordAuthors &&
                                                <><Dropdown title="Authors">
                                                    {authorsRef.current.map((author, i) => <li>
                                                        <div className="formCheck">
                                                            <div className="form-check">
                                                                <input defaultChecked={(verse.words as InnerLyricsStorage[])[wordPosition].authors[i].checked} className="form-check-input" ref={input => {
                                                                    // Add this checkbox to the array
                                                                    const arr = dropdownMap.current.get(verse.id);
                                                                    if (!arr) dropdownMap.current.set(verse.id, [{ checkbox: input, id: author.id }]); else {
                                                                        arr.push({ checkbox: input, id: author.id });
                                                                        dropdownMap.current.set(verse.id, arr);
                                                                    }
                                                                }} type="checkbox" onChange={(e) => {
                                                                    (finalLyrics.current[position].words as InnerLyricsStorage[])[wordPosition].authors[i].checked = e.target.checked;
                                                                }}></input><label className="form-check-label">{author.name}</label>
                                                            </div>
                                                        </div>
                                                    </li>)}
                                                </Dropdown>
                                                </>
                                            }
                                        </tr>
                                    )}
                                </> 
                                </SimpleContainer>: <>
                                    <tr key={`MusicSync-Audio-${position}`}>
                                        <td>
                                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                {CreateSettingsDropdown(position, verse)}
                                                <input step={0.03} ref={el => (inputMap.current[verse.id] = el)} onClick={(e) => {
                                                    if (ref.current) ref.current.currentTime = +(e.target as HTMLInputElement).value; // Go back to the start of the element
                                                    changeInput(e.target as HTMLInputElement); // And make it focused also for the rest of the script
                                                }} className="form-control" onChange={(e) => {
                                                    finalLyrics.current[position].start = +(e.target as HTMLInputElement).value; // Update the start value of the finalLyrics.current array
                                                    if (ref.current) ref.current.currentTime = +(e.target as HTMLInputElement).value; // And also update the value of the Audio element
                                                }} type="number" defaultValue={finalLyrics.current[position]?.start ?? 0}></input>
                                            </div>
                                        </td>
                                        <td><input onKeyDown={({ key }) => {
                                            if (key === "Enter") { // Create a new line
                                                const id = crypto.randomUUID();
                                                finalLyrics.current.splice(position + 1, 0, {
                                                    verse: "",
                                                    start:  (ref.current && !ref.current.paused) ? ref.current.currentTime : verse.start,
                                                    id,
                                                    authors: structuredClone(verse.authors)
                                                });
                                                forceRerender(prev => Object.assign({}, { update: prev.update + 1, focus: id }));
                                            }
                                        }} onClick={() => {
                                            const findItem = inputMap.current[verse.id] // Find the above input[number] element by using the inputMap.current
                                            if (findItem) { // Check that findItem exists and that the next elemente exists (it needs to check that is both not undefined and not null)
                                                changeInput(findItem)
                                                if (ref.current) ref.current.currentTime = +(findItem as HTMLInputElement).value;
                                            }
                                        }
                                        } className="form-control" onChange={(e) => {
                                            // Update the lyrics on the finalLyrics.current array
                                            finalLyrics.current[position].verse = (e.target as HTMLInputElement).value;
                                            if (e.target.value === "") { // Delete the current verse
                                                finalLyrics.current.splice(position, 1);
                                                forceRerender(prev => Object.assign({}, { update: prev.update + 1, focus: finalLyrics.current[position] ? finalLyrics.current[position].id : finalLyrics.current[position - 1].id }));
                                            }
                                        }} type="text" defaultValue={finalLyrics.current[position]?.verse ?? verse}></input></td>
                                        {verse.authors && <td>
                                            <Dropdown title="Authors">
                                                {verse.authors.map((author, i) => <li>
                                                    <div className="formCheck">
                                                        <div className="form-check">
                                                            <input defaultChecked={author.checked} className="form-check-input" ref={input => {
                                                                // Add the current author checkbox to the list
                                                                const arr = dropdownMap.current.get(verse.id);
                                                                if (!arr) dropdownMap.current.set(verse.id, [{ checkbox: input, id: author.id }]); else {
                                                                    arr.push({ checkbox: input, id: author.id });
                                                                    dropdownMap.current.set(verse.id, arr);
                                                                }
                                                            }} type="checkbox" onChange={(e) => {
                                                                (finalLyrics.current[position].authors as AuthorsStorage[])[i].checked = e.target.checked;
                                                            }}></input><label className="form-check-label">{author.name}</label>
                                                        </div>
                                                    </div>
                                                </li>)}
                                            </Dropdown>
                                        </td>}
                                    </tr>
                                </>
                            )}
                        </thead>
                    </table>
                </div>
            </Card>
        </>
        }</>
}