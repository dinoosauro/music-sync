/**
 * Read a file from the user's drive, using either File System API or classic inputs
 * @param id the ID to use for opening the file
 * @param types the allowed types for this operation
 * @returns A promise, with a File when resolved
 */
export default function OpenFile({ id, types }: SaveFilePicker) {
    return new Promise<File>(async (resolve, reject) => {
        if (window.showOpenFilePicker && localStorage.getItem("MusicSync-FileSystemAPI") !== "a") {
            const handle = await window.showOpenFilePicker({ id, types });
            resolve(await handle[0].getFile());
        } else {
            const input = document.createElement("input");
            input.type = "file";
            if (types && types[0]) input.accept = Object.keys(types[0].accept ?? { "*/*": "" })[0];
            input.onchange = () => {
                if (input.files) {
                    resolve(input.files[0]);
                } else reject("No files found");
            }
            input.click();
        }
    })
}