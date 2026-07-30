import { ArrowRight, ClipboardList, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge'
import { useWorkspace } from '../../state/WorkspaceContext'

export default function RequestList({ embedded = false }: { embedded?: boolean }) {
  const { workspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const requests = useMemo(() => workspace.requests.filter((item) => `${item.title}${item.requestNo}${item.supplier}`.toLowerCase().includes(query.toLowerCase())), [workspace.requests, query])
  const content = <section className="app-card overflow-hidden">
    <div className="panel-header"><div><h2 className="section-title">采购申请</h2><p className="mt-1 text-xs text-secondary-500">共 {requests.length} 条业务记录</p></div>{!embedded && <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" /><input className="field py-2 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、单号或供应商" /></div>}</div>
    <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>申请单</th><th>类别</th><th>金额</th><th>申请人</th><th>状态</th><th>更新时间</th></tr></thead><tbody>
      {requests.slice(0, embedded ? 5 : undefined).map((request) => <tr key={request.id}><td><div className="font-medium text-secondary-900">{request.title}</div><div className="mt-0.5 font-mono text-[11px] text-secondary-400">{request.requestNo}</div></td><td>{request.category}</td><td className="font-medium text-secondary-900">¥ {request.amount.toLocaleString()}</td><td><div>{request.applicant}</div><div className="text-xs text-secondary-400">{request.department}</div></td><td><StatusBadge status={request.status} /></td><td>{new Date(request.updatedAt).toLocaleDateString()}</td></tr>)}
    </tbody></table></div>
    {!requests.length && <div className="empty-state m-5"><ClipboardList size={28} className="text-secondary-300" /><p className="mt-3 text-sm text-secondary-500">暂时没有匹配的申请</p></div>}
    {embedded && <div className="border-t border-secondary-100 p-3 text-right"><Link to="/runtime/requests" className="btn-ghost">查看全部 <ArrowRight size={15} /></Link></div>}
  </section>
  return embedded ? content : <div className="page-shell max-w-[1500px]">{content}</div>
}
