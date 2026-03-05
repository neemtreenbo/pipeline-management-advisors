import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

interface OrgContextValue {
    orgId: string | null
}

const OrgContext = createContext<OrgContextValue>({ orgId: null })

export function OrgProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [orgId, setOrgId] = useState<string | null>(null)

    useEffect(() => {
        if (!user) { setOrgId(null); return }
        supabase
            .from('memberships')
            .select('org_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle()
            .then(({ data }) => { if (data) setOrgId(data.org_id) })
    }, [user])

    return <OrgContext.Provider value={{ orgId }}>{children}</OrgContext.Provider>
}

export function useOrg() {
    return useContext(OrgContext)
}
