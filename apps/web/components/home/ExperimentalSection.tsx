'use client';

import Link from 'next/link';
import {
  ArrowRight, Bot, BookOpen, Calendar,
  Cpu, MessageSquare, Zap, FlaskConical,
} from 'lucide-react';

const agents = [
  {
    name: 'Alfred',
    role: 'Senior Researcher',
    model: 'Claude Opus 4.5',
    hardware: 'Mac Mini',
    color: 'emerald',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    tasks: ['Deep analysis & writing', 'Literature reviews', 'Code architecture'],
  },
  {
    name: 'Pip',
    role: 'Fast Support',
    model: 'GPT-5-nano + Ollama',
    hardware: 'Raspberry Pi 5',
    color: 'violet',
    borderColor: 'border-violet-500/20',
    bgColor: 'bg-violet-500/5',
    textColor: 'text-violet-400',
    dotColor: 'bg-violet-400',
    tasks: ['Discord/Telegram triage', 'Quick lookups', 'Monitoring & alerts'],
  },
];

const blogPosts = [
  {
    title: 'OpenClaw Model Benchmark 2026',
    description: '17 models, 8 tests — Claude Opus 4.6, GPT-5.2, O3, and more',
    href: '/blog/openclaw-model-benchmark-2026',
    tag: 'Benchmark',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    title: 'Multi-Agent System: Alfred & Pip',
    description: 'Two agents, shared memory, role specialization, $35/month',
    href: '/blog/multi-agent-system-alfred-pip',
    tag: 'Architecture',
    tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    title: 'AI Agents on Raspberry Pi',
    description: 'Step-by-step OpenClaw setup with local LLM fallback',
    href: '/blog/openclaw-raspberry-pi-setup',
    tag: 'Tutorial',
    tagColor: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  {
    title: 'Discord Multi-Bot Brainstorming',
    description: 'Mention routing and coordination for AI bot teams',
    href: '/blog/discord-multi-bot-brainstorm',
    tag: 'Integration',
    tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
];

export function ExperimentalSection() {
  return (
    <section className="border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 mb-6">
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
              Experimental Lab
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Multi-Agent AI Experiments
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We run autonomous AI agents 24/7 using{' '}
            <a
              href="https://github.com/BandarLabs/openclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              OpenClaw
            </a>
            {' '}— exploring how different models, tools, and architectures work together
            to get the most out of AI.
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className={`p-6 rounded-xl border ${agent.borderColor} ${agent.bgColor} relative overflow-hidden`}
            >
              {/* Dot grid subtle */}
              <div className="absolute inset-0 dot-grid opacity-10" />

              <div className="relative">
                {/* Agent header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg border ${agent.borderColor} bg-slate-900/50 flex items-center justify-center`}>
                    <Bot className={`w-5 h-5 ${agent.textColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.dotColor} pulse-dot`} />
                    </div>
                    <p className={`text-xs ${agent.textColor} font-medium`}>{agent.role}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 mb-0.5">Model</p>
                    <p className="text-xs text-slate-300 font-medium">{agent.model}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50">
                    <p className="text-[10px] text-slate-500 mb-0.5">Hardware</p>
                    <p className="text-xs text-slate-300 font-medium">{agent.hardware}</p>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-1.5">
                  {agent.tasks.map((task) => (
                    <div key={task} className="flex items-center gap-2 text-sm text-slate-400">
                      <Zap className={`w-3 h-3 ${agent.textColor} flex-shrink-0`} />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Philosophy callout */}
        <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/30 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">The Approach</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Different AI models excel at different things. Alfred uses Claude Opus for deep reasoning
                and long-form writing. Pip uses GPT-5-nano for fast responses and falls back to local
                LLaMA 3.2 via Ollama when APIs are down. They share memory through a filesystem — simpler
                and more reliable than vector databases for small teams. Total cost: ~$35/month for two
                agents running 24/7.
              </p>
            </div>
          </div>
        </div>

        {/* Blog Posts */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              From the Blog
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {blogPosts.map((post) => (
              <Link
                key={post.href}
                href={post.href}
                className="group flex items-start gap-3 p-4 rounded-lg border border-slate-800/60 hover:border-slate-700/80 bg-slate-900/20 hover:bg-slate-900/50 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0 group-hover:text-slate-400 transition-colors" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${post.tagColor}`}>
                      {post.tag}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium group-hover:text-blue-100 transition-colors truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{post.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Links row */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
          >
            <BookOpen className="w-4 h-4" />
            All blog posts
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/diary"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors group"
          >
            <Calendar className="w-4 h-4" />
            Agent Diary
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
