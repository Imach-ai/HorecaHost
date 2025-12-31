import { Suspense } from 'react'
import Loading from './Loading'

export default function LazyPage({ children }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loading size="large" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

