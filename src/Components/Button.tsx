import { ReactNode } from "react";

interface Props {
    /**
     * The color of the button, depending on its function (primary, secondary etc.)
     */
    type?: "primary" | "secondary" | "success" | "danger" | "warning" | "info",
    /**
     * The content inside the button
     */
    children?: ReactNode,
    /**
     * If the button style should be set as outline
     */
    isOutline?: boolean,
    /**
     * The event that'll be fired when the button is clicked
     * @param e the click event
     */
    click?: (e: any) => void,
    /**
     * Use "fit-content" instead of "100%" for the width
     */
    isSmall?: boolean,
    /**
     * If the button should trigger the opening of a modal dialog
     */
    modalTrigger?: string
}
/**
 * Creates a Button, following Bootstrap's style
 *  * @returns the Button ReactNode
 */
export default function Button({ type = "primary", children, click, isSmall, isOutline, modalTrigger }: Props) {
    return <button style={{ width: isSmall ? "100%" : "fit-content" }} onClick={(e) => { click && click(e) }} data-bs-toggle={modalTrigger ? "modal" : undefined} data-bs-target={modalTrigger ? modalTrigger : undefined} className={`btn btn-${isOutline ? "outline-" : ""}${type}`}>{children}</button>
}