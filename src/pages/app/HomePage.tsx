import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <div className="app-home">
            <div className="app-home-header">
                <div>
                    <h1 className="app-home-greeting">Good day 👋</h1>
                    <p className="app-home-email">{user?.email}</p>
                </div>
                <button className="btn btn-ghost" onClick={handleSignOut}>
                    Sign Out
                </button>
            </div>

            <div className="app-home-widgets">
                <div className="widget-card">
                    <h3>Tasks Due Today</h3>
                    <p className="widget-empty">No tasks due today.</p>
                </div>
                <div className="widget-card">
                    <h3>Deals Needing Follow-up</h3>
                    <p className="widget-empty">All caught up!</p>
                </div>
                <div className="widget-card">
                    <h3>Proposals Pending</h3>
                    <p className="widget-empty">No pending proposals.</p>
                </div>
            </div>
        </div>
    )
}
