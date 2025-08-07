interface Props {
    /**
     * The function called when the user clicks on the icon.
     * This function should bring back the user to the home screen.
     */
    callback: () => void
}
/**
 * The header, with the website icon and the website name.
 * @returns the ReactNode of the header
 */
export default function Header({callback}: Props) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "15px" }}>
        <img onClick={() => {
            confirm("Do you want to pick a new file? All changes done will be discarded.") && callback();
        }} width={36} height={36} style={{ marginRight: "10px" }} src="./icon.svg"></img>
        <h1 style={{ margin: "0px" }}>MusicSync</h1>
    </div>
}