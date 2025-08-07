import { ReactNode } from "react"

interface Props {
    /**
     * The content displayed inside the dropdown button
     */
    title: string | ReactNode,
    /**
     * The items to the dropdown
     */
    children: ReactNode,
    /**
     * The color of the dropdown button. It's appendend to the `button-` bootstrap class, so also outline values can be added
     */
    btnColor?: string,
    /**
     * The width of the dropdown div when expanded
     */
    dropdownWidth?: string,
    /**
     * if the content inside the dropdown button should be centered vertically or not
     */
    center?: boolean,
    /**
     * If the dropdown should be disabled or not
     */
    disabled?: boolean
}
/**
 * A dropdown button, that reveals more items when clicked
 * @returns the dropdown button
 */
export default function Dropdown({ children, title, btnColor = "secondary", dropdownWidth, center, disabled }: Props) {
    return <span className="dropdown">
        <button disabled={disabled || undefined} style={{display: center ? "flex": undefined, alignItems: center ? "center" : undefined }} className={`btn btn-${btnColor} dropdown-toggle`} type="button" data-bs-toggle="dropdown">
            {typeof title === "string" ? <span>{title}</span> : title}
        </button>
        <ul className="dropdown-menu" style={{padding: "15px", width: dropdownWidth}} >
            {children}
        </ul>
    </span>
}