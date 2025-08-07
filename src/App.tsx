import { useEffect, useId, useReducer, useRef, useState } from "react";
import Header from "./Components/Header";
import Button from "./Components/Button";
import AudioInterface from "./Components/AudioInterface";
import Card from "./Components/Card";
import SaveFile from "./Scripts/SaveFile";
import Checkbox from "./Components/Checkbox";
import OpenFile from "./Scripts/OpenFile";
import Input from "./Components/Input";
import type { IAudioMetadata, IPicture } from "music-metadata";
import Dropdown from "./Components/Dropdown";
import Dialog from "./Components/Dialog";
import { licenseText, openSourceData } from "./Scripts/OpenSource";
import type bootstrap from "bootstrap";
import ExportTools from "./Scripts/ExportTools";
interface State {
  /**
   * The number of the UI progress
   */
  action: number,
  /**
   * The Blob URL of the audio file
   */
  blobUrl?: string,
  /**
   * Text-only, unsynced lyrics. Will be ignored if `lrcItem` or `ttmlItem` is not undefined.
   */
  lyrics?: string,
  /**
   * The name of the uploaded file
   */
  name?: string,
  /**
   * The metadata extracted by music-metadata
   */
  metadata?: IAudioMetadata,
  /**
   * The content of the selected LRC file (not parsed)
   */
  lrcItem?: string,
  /**
   * The content of the selected TTML file (not parsed)
   */
  ttmlItem?: string
  /**
   * A string array with the name of the chosen authors
   */
  authors?: string[],
}
declare global {
  interface SaveFilePicker {
    id?: string,
    suggestedName?: string,
    types?: {
      description: string,
      accept: {}
    }[],
  }
  interface Window {
    showSaveFilePicker: ({ id, suggestedName, types }: SaveFilePicker) => Promise<FileSystemFileHandle>,
    showOpenFilePicker: ({ id, types }: SaveFilePicker) => Promise<FileSystemFileHandle[]>,
    bootstrap: typeof bootstrap
  }
}
export default function App() {
  let [state, updateState] = useState<State>({
    action: 0
  });
  let [selectedLicense, updateSelectedOpenSourceLicense] = useState(0); // Change the license that is being shown in the Open Source dialog
  useEffect(() => {
    localStorage.getItem("MusicSync-Theme") === "a" && document.body.setAttribute("data-bs-theme", "light"); // Update the theme if the user has bad preferences
  }, [])
  /**
   * If the website should try reading metadata from the selected audio file
   */
  let useMetadata = useRef(localStorage.getItem("MusicSync-UseMetadata") === "a");
  /**
   * If the user wants to enable the word-by-word sync mode
   */
  let wordByWordSync = useRef(localStorage.getItem("MusicSync-WordByWord") === "a");
  /**
   * If the user wants to choose the authors of each word
   */
  let showAuthorsForEachWord = useRef(localStorage.getItem("MusicSync-WordByWordAuthors") === "a");
  /**
   * The value of the input[type=text] that permits to add a new author
   */
  let currentText = useRef("");
  /**
   * The ID of the open source licenses dialog
   */
  const openSourceModalId = useRef(useId());
  return <div style={{padding: "10px"}}>
    <Header callback={() => updateState(prev => { // If the icon is clicked, the user will go back to the file selection screen
      prev.blobUrl && URL.revokeObjectURL(prev.blobUrl);
      return {action: 0}
    })}></Header><br></br>
    {state.action === 0 ? <>
      <h2>Choose an audio file:</h2>
      <Button click={async () => {
        const file = await OpenFile({ id: "MusicSync-OpenAudio", types: [{ description: "An audio file", accept: { "audio/*": [".mp3", ".m4a", ".ogg", ".flac", ".alac", ".opus", ".mp4", ".aac", ".amr"] } }] })
        if (useMetadata.current) { // Read metadata using the music-metadata library. We'll use Promises.then instead of await so that we don't block the re-render while the library loads and reads the metadata
          import("music-metadata").then((metadata) => {
            metadata.parseBlob(file).then((res) => {
              if (!res.common.lyrics && res.native["ID3v2.4"]) { // The music-metadata library doesn't seem to recognize USLT tags in ID3v2.4, so we'll manually add it
                const lyrics = res.native["ID3v2.4"].find(item => item.id === "TXXX:USLT");
                // @ts-ignore
                if (lyrics) res.common.lyrics = [{text: lyrics.value}];
              }
              updateState(prev => { return { ...prev, metadata: res } })
            })
          });
        }
        updateState((prevState) => { return { ...prevState, blobUrl: URL.createObjectURL(file), action: 1, name: file.name } });
      }}>Choose audio</Button><br></br><br></br>
      <Checkbox defaultChecked={useMetadata.current} text={<span>Try reading metadata using the <a href="https://github.com/Borewit/music-metadata">music-metadata</a> library</span>} change={(e) => {
        localStorage.setItem("MusicSync-UseMetadata", e ? "a" : "b");
        useMetadata.current = e;
      }}></Checkbox><br></br>
      <Checkbox defaultChecked={localStorage.getItem("MusicSync-FileSystemAPI") === "a"} text="Avoid using the File System API (if available) for FS operations" change={(val) => localStorage.setItem("MusicSync-FileSystemAPI", val ? "a" : "b")}></Checkbox>
    </> : state.action === 1 ? <>
      <h2>Lyrics import option:</h2><br></br>
      <Card header="Authors">
        <p>You can add here the singers' name. If there's more than one singer, this'll permit you to flag which part is sang by each author.</p>
        <Input defaultVal="Author 1" type="text" update={(e) => { currentText.current = e }} hint="Author name">
          <Button click={() => {
            updateState(prev => {
              const authors = [...(prev.authors ?? [])]
              authors.push(currentText.current);
              return { ...prev, authors };
            })
          }}>Add</Button>
        </Input><br></br>
        <Card header="Added authors:">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {state.authors && state.authors.map((item, i) => <Button key={`AuthorButton-${item}-${i}`} isOutline={true} type="secondary" click={() => {
              updateState(prev => {
                const authors = [...(prev.authors ?? [])];
                authors.splice(i, 1);
                return { ...prev, authors };
              })
            }}>{item}</Button>)}
          </div>
        </Card>
      </Card><br></br>
      <Card header="Import from:">
        <p>Choose if you want to import the lyrics from an already existing file, or if you want to write them directly from this UI. In the second case, after you've clicked on the <code>Start blank</code> button, write a line, then press <code>Space</code> to create a new line.</p>
        <Checkbox defaultChecked={wordByWordSync.current} change={(e) => {localStorage.setItem("MusicSync-WordByWord", e ? "a" : "b"); wordByWordSync.current = e;}} text="Sync lyrics word-by-word"></Checkbox><br></br>
        <Checkbox defaultChecked={showAuthorsForEachWord.current} change={(e) => {localStorage.setItem("MusicSync-WordByWordAuthors", e ? "a" : "b"); showAuthorsForEachWord.current = e;}} text="Specify the author of each word. Experimental and unsupported by many players (it's suggested to keep this false)"></Checkbox><br></br>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Dropdown btnColor="primary" title="Import from a file">
            <a onClick={async () => { // Load a LRC file. Both the lyrics and the verse positions will be fetched from the LRC file
              const file = await OpenFile({ id: "MusicSync-OpenLRC" })
              const text = await file.text();
              updateState(prevState => { return { ...prevState, lrcItem: text, action: 2 } });
            }} className="dropdown-item">Import from LRC file</a>
            <a onClick={async () => {
              const file = await OpenFile({ id: "MusicSync-OpenTTML" });
              const text = await file.text();
              updateState(prev => { return { ...prev, action: 2, ttmlItem: text } });
            }} className="dropdown-item">Import from TTML file</a>
            <a></a>
            <a onClick={async () => {
              const text = await navigator.clipboard.readText();
              updateState(prev => {return {...prev, action: 2, lyrics: text}})
            }} className="dropdown-item">Import from the text in your clipboard</a>
            <a onClick={async () => {
              const file = await OpenFile({ id: "MusicSync-OpenLRC" })
              const text = await file.text();
              updateState(prev => { return { ...prev, action: 2, lyrics: text } });
            }} className="dropdown-item">Import from text file</a>
          </Dropdown>
          {state.metadata?.common?.lyrics && <Button type="warning" click={() => updateState(prev => {
            // If the lyrics are synced, we'll create a LRC file with the timestamp and the text. Otherwise, we'll pass the lyrics as a normal text
            let [outputLyrics, outputLrc] = ["", ""];
            if (prev.metadata?.common?.lyrics) {
              const lyric = prev.metadata.common.lyrics[0];
              if (lyric.syncText && lyric.syncText.length !== 0) {
                for (const str of lyric.syncText) outputLrc += `[${ExportTools.getValue((str.timestamp ?? 0) / 1000)}] ${str.text}\n`;
              }
              if (lyric.text) outputLyrics = lyric.text;
            }
            return {...prev, action: 2, lyrics: outputLyrics, lrcItem: outputLrc === "" ? undefined : outputLrc}
          })}>Use embedded lyrics</Button>}
          <Button type="secondary" click={() => updateState(prev => { return { ...prev, action: 2, lyrics: "" } })}>Start blank</Button>
        </div>
        <br></br><br></br>
        <i>If you want to keep only the lyrics, you'll be able to download only them as a TXT file in the next step</i>
      </Card><br></br>
      {state.metadata?.common?.picture && <>
        <span style={{ marginLeft: "10px" }}></span>
        <Button type="secondary" click={async () => { // Download the album image using jsmediatags for fetching it
          for (const picture of (state.metadata?.common?.picture as IPicture[])) {
            const format = picture.format.substring(picture.format.lastIndexOf("/") + 1); // The output file extension
            await SaveFile({ suggestedName: `${state.name?.substring(0, state.name?.lastIndexOf("."))}.${format}`, isImage: 1, types: [{ description: "The image of the audio file passed", accept: { [picture.format]: [`.${format}`] } }], content: new Blob([picture.data]) });
          }
        }}>Download album art</Button>
        <span style={{ marginLeft: "10px" }}></span>
      </>}
      {state.metadata && <Button type="secondary" click={() => { // Download everything fetched from jsmediatags as a JSON file. This also includes an ArrayBuffer of the album art, if available.
        SaveFile({ suggestedName: `${state.name?.substring(0, state.name?.lastIndexOf("."))}-Metadata.json`, isImage: 2, types: [{ description: "The JSON file containing all the metadata fetched by jsmediatags", accept: { "application/json": [".json"] } }], content: new Blob([JSON.stringify(state.metadata)]) })

      }}>Download all of the fetched metadata</Button>}
    </> : <>
      <AudioInterface wordByWordAuthors={showAuthorsForEachWord.current} ttmlSource={state.ttmlItem} wordByWordSync={wordByWordSync.current} authors={state.authors ? state.authors.map(item => { return { name: item, id: crypto.randomUUID() } }) : undefined} lrcSource={state.lrcItem} name={state.name?.substring(0, state.name?.lastIndexOf("."))} audioUrl={state.blobUrl ?? ""} lyrics={state.lyrics?.split("\n")}></AudioInterface>
    </>
    }
    <br></br><br></br><br></br>
    <div style={{display: "flex", gap: "10px", flexWrap: "wrap"}}>
    <Button click={() => { // Change Bootstrap theme
      localStorage.setItem("MusicSync-Theme", localStorage.getItem("MusicSync-Theme") === "a" ? "b" : "a");
      document.body.setAttribute("data-bs-theme", localStorage.getItem("MusicSync-Theme") === "a" ? "light" : "dark");
    }}>Change theme</Button><Button type="secondary" click={() => window.open("https://github.com/dinoosauro/music-sync", "_blank")}>View on GitHub</Button>
    <Button type="secondary" isOutline={true} modalTrigger={`#${openSourceModalId.current}`}>View open source licenses</Button>
    <Dialog title="Open source licenses" id={openSourceModalId.current}>
      <select className="form-select" defaultValue={selectedLicense} onChange={(e) => updateSelectedOpenSourceLicense(+e.target.value)}>
        {openSourceData.map((a, i) => <option value={i}>{a.name}</option>)}
      </select><br></br>
      <Card header={`${openSourceData[selectedLicense].license} License`}>
        <h4><a href={openSourceData[selectedLicense].link} target="_blank">{openSourceData[selectedLicense].name}</a></h4>
        <p style={{whiteSpace: "pre-line"}}>{licenseText(openSourceData[selectedLicense].license, openSourceData[selectedLicense].author)}</p>
      </Card>
    </Dialog>
    </div>
  </div>
}