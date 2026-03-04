import { Link } from 'react-router-dom'

export default function LandingPage() {
    return (
        <div className="landing">
            <div className="landing-hero">
                <div className="landing-badge">Sales Rep CRM</div>
                <h1 className="landing-title">
                    Your pipeline,<br />
                    <span className="gradient-text">under control.</span>
                </h1>
                <p className="landing-subtitle">
                    A lightweight CRM built for insurance advisors. Track clients, deals, tasks, and proposals — all in one place.
                </p>
                <div className="landing-actions">
                    <Link to="/signup" className="btn btn-primary">Get Started</Link>
                    <Link to="/login" className="btn btn-ghost">Sign In</Link>
                </div>
            </div>

            <div className="landing-features">
                <div className="feature-card">
                    <div className="feature-icon">🗂️</div>
                    <h3>Pipeline</h3>
                    <p>Kanban board to move deals from Prospect to Issued.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">✅</div>
                    <h3>Tasks</h3>
                    <p>Never miss a follow-up. Today, upcoming, overdue.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">📝</div>
                    <h3>Notes</h3>
                    <p>Capture meeting context and link it to clients and deals.</p>
                </div>
            </div>
        </div>
    )
}
