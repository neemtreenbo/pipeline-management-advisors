import { Umbrella, GraduationCap, ShieldCheck, Stethoscope, TrendingUp, Home, ScrollText, Briefcase } from 'lucide-react'

export function getDealIcon(title: string | undefined, size = 16, className?: string) {
    if (!title) return <Briefcase size={size} className={className} />;
    const t = title.toLowerCase();

    if (t.includes('retirement')) return <Umbrella size={size} className={className} />;
    if (t.includes('education')) return <GraduationCap size={size} className={className} />;
    if (t.includes('income')) return <ShieldCheck size={size} className={className} />;
    if (t.includes('health') || t.includes('illness')) return <Stethoscope size={size} className={className} />;
    if (t.includes('investment')) return <TrendingUp size={size} className={className} />;
    if (t.includes('estate')) return <Home size={size} className={className} />;
    if (t.includes('legacy')) return <ScrollText size={size} className={className} />;

    return <Briefcase size={size} className={className} />;
}
