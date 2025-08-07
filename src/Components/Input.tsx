import { ReactNode } from "react"

interface Props {
    /**
     * The function that'll be called when there's an input to, well, the input element
     * @param e the value from the input
     */
    update: (e: any) => void,
    /**
     * The placeholder to put in the input when it's empty
     */
    hint: string,
    /**
     * The default value of the input
     */
    defaultVal: string,
    /**
     * The type of the input (text, number etc.)
     */
    type: "text" | "number",
    /**
     * The content that'll be added at the right of the input
     */
    children?: ReactNode
}
/**
 * Create an input, following Bootstrap style
 * @returns a ReactNode of the input
 */
export default function Input({ update, hint, defaultVal, type, children }: Props) {
    return <div className="input-group mb-3">
        <span className="input-group-text">{hint}</span>
        <input type={type} className="form-control" defaultValue={defaultVal} onInput={(e) => { update((e.target as HTMLInputElement).value) }}></input>
        {children}
    </div>
}