import { statusLabel } from '../domain/workflowEngine.js'
import type { RequestStatus } from '../types/workspace'

const classes: Record<RequestStatus, string> = {
  draft: 'badge-gray',
  pending_department: 'badge-blue',
  pending_finance: 'badge-amber',
  approved: 'badge-green',
  rejected: 'badge-red',
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={classes[status]}>{statusLabel(status)}</span>
}
