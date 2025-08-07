import { ReactNode } from "react"

interface Props {
  /**
   * The ID of the current dialog, so that it can be shown both by using bootstrap attributes and programmatically
   */
  id: string,
  /**
   * The content in the body of the modal
   */
  children: ReactNode,
  /**
   * The title of the dialog
   */
  title: string,
  /**
   * An optional object. If passed, another button will be added that'll trigger an action, that by default doesn't close the dialog.
   */
  actionBtn?: {
    /**
     * The function that'll be called when the button is clicked
     */
    callback: () => void,
    /**
     * The text inside of the button
     */
    text: string
  }
}

export default function Dialog({ id, children, title, actionBtn }: Props) {
  return <div className="modal fade" id={id} data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-hidden="true">
    <div className="modal-dialog">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          {actionBtn && <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => actionBtn.callback()}>{actionBtn.text}</button>}
        </div>
      </div>
    </div>
  </div>

}