'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth';

interface AppFeature {
  icon: React.ReactNode;
  text: string;
}

interface AppSectionProps {
  name: string;
  tagline: string;
  description: string;
  features: AppFeature[];
  accentColor: 'blue' | 'cyan' | 'violet';
  badge?: string;
  href: string;
  reverse?: boolean;
  visual: React.ReactNode;
}

const accentMap = {
  blue: {
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    tagline: 'text-blue-400',
    dot: 'bg-blue-400',
    button: 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25',
    glow: 'from-blue-500/5 to-transparent',
    status: 'text-blue-400',
  },
  cyan: {
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    tagline: 'text-cyan-400',
    dot: 'bg-cyan-400',
    button: 'bg-cyan-600 hover:bg-cyan-500 hover:shadow-cyan-500/25',
    glow: 'from-cyan-500/5 to-transparent',
    status: 'text-cyan-400',
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    tagline: 'text-violet-400',
    dot: 'bg-violet-400',
    button: 'bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/25',
    glow: 'from-violet-500/5 to-transparent',
    status: 'text-violet-400',
  },
};

export function AppSection({
  name,
  tagline,
  description,
  features,
  accentColor,
  badge,
  href,
  reverse = false,
  visual,
}: AppSectionProps) {
  const { user } = useAuth();
  const colors = accentMap[accentColor];

  return (
    <section className="border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div
          className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
            reverse ? 'lg:[direction:rtl]' : ''
          }`}
        >
          {/* Text Side */}
          <div className={reverse ? 'lg:[direction:ltr]' : ''}>
            {/* Status Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} pulse-dot`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${colors.status}`}>
                Station Active
              </span>
              {badge && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${colors.badge}`}
                >
                  {badge}
                </span>
              )}
            </div>

            {/* Name */}
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              {name}
            </h2>

            {/* Tagline */}
            <p className={`text-lg font-medium ${colors.tagline} mb-4`}>{tagline}</p>

            {/* Description */}
            <p className="text-slate-400 leading-relaxed mb-8 max-w-lg">{description}</p>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 text-slate-500 flex-shrink-0">{feature.icon}</span>
                  <span className="text-sm text-slate-300">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={user ? href : '/login'}
              className={`group inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-lg ${colors.button}`}
            >
              {user ? `Open ${name}` : 'Get Started'}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Visual Side */}
          <div className={`relative ${reverse ? 'lg:[direction:ltr]' : ''}`}>
            <div
              className={`absolute -inset-8 bg-gradient-to-br ${colors.glow} rounded-3xl blur-2xl opacity-50`}
            />
            <div className="relative">{visual}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
