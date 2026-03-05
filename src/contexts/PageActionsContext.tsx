import { createContext, useContext, useState, type ReactNode } from 'react'

interface PageActionsContextType {
    portalNode: ReactNode
    setPortalNode: (node: ReactNode) => void
}

const PageActionsContext = createContext<PageActionsContextType | undefined>(undefined)

export function PageActionsProvider({ children }: { children: ReactNode }) {
    const [portalNode, setPortalNode] = useState<ReactNode>(null)

    return (
        <PageActionsContext.Provider value={{ portalNode, setPortalNode }}>
            {children}
        </PageActionsContext.Provider>
    )
}

export function usePageActions() {
    const context = useContext(PageActionsContext)
    if (context === undefined) {
        throw new Error('usePageActions must be used within a PageActionsProvider')
    }
    return context
}
