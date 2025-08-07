import { ReactNode } from "react"

interface Props {
    /**
     * The event that'll be called when the checkbox is checked/unchecked
     * @param checked if the checkbox has been checked or not
     */
    change: (checked: boolean) => void,
    /**
     * The description of the checkbox
     */
    text: ReactNode,
    /**
     * The default value of the checkbox
     */
    defaultChecked?: boolean
}
/**
 * Creates a checkbox, following Bootstrap's style
 * @returns a ReactNode with the checkbox
 */
export default function Checkbox({ change, text, defaultChecked}: Props) {
    return <div className="form-check">
        <input defaultChecked={defaultChecked} className="form-check-input" type="checkbox" onChange={(e) => change((e.target as HTMLInputElement).checked)}></input><label className="form-check-label">{text}</label>
    </div>

}