import { ReactNode } from "react"

interface Props {
    children: ReactNode
}
/**
 * A Component that returns the children that have been passed.
 * This is done so that we can add a key also to <> elements
 * @returns the SimpleContainer ReactNode
 */
export default function SimpleContainer({children}: Props) {
    return <>
    {children}
    </>
}