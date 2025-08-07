import { createRoot } from "react-dom/client";
import DownloadLink from "../Components/DownloadLink";

interface Props extends SaveFilePicker {
    content: Blob,
    isImage?: number
}
/**
 * Write (or download) a file to the user's drive.
 * @param suggestedName the suggested name of the downloaded file
 * @param types an object, valid for the File System API, to allow only certain file extensions
 * @param content a Blob of the content to write
 * @param isImage update the ID of the File System save picker for the image exportation
 * @returns A promise, resolved when the download has started / the file has been written to the storage
 */
export default async function SaveFile({ suggestedName, types, content, isImage }: Props) {
    try {
        if (localStorage.getItem("MusicSync-FileSystemAPI") === "a") throw new Error(); // Avoid using File System API if the user doesn't want it
        let picker = await window.showSaveFilePicker({ id: `MusicSync-Export${isImage === 1 ? "Image" : isImage === 2 ? "Metadata" : "Lyrics"}`, suggestedName, types });
        let write = await picker.createWritable();
        await write.write(content);
        await write.close();
        return false;
    } catch (ex) {
        console.warn(ex, "Failed to use Chromium's SaveDirectoryPicker. Defaulting to classic link download");
        let div = document.createElement("div");
        createRoot(div).render(DownloadLink({ url: URL.createObjectURL(content), name: suggestedName ?? "MusicSync.lrc", closeCallback: () => div.remove() }));
        document.body.append(div);
        setTimeout(() => div.querySelector("a")?.click(), 100);
    }
}