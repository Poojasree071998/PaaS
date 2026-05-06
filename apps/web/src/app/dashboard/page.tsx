import { 
  Plus, 
  ExternalLink, 
  GitBranch, 
  Clock,
  ArrowUpRight
} from 'lucide-react';

const projects = [
  {
    id: '1',
    name: 'deployflow-api',
    slug: 'deployflow-api',
    url: 'deployflow-api.deployflow.app',
    status: 'Ready',
    branch: 'main',
    updatedAt: '2h ago',
    framework: 'Node.js'
  },
  {
    id: '2',
    name: 'ecommerce-frontend',
    slug: 'ecommerce-frontend',
    url: 'shop-demo.deployflow.app',
    status: 'Ready',
    branch: 'production',
    updatedAt: '5h ago',
    framework: 'Next.js'
  },
  {
    id: '3',
    name: 'marketing-site',
    slug: 'marketing-site',
    url: 'marketing.deployflow.app',
    status: 'Building',
    branch: 'feat/new-landing',
    updatedAt: '12m ago',
    framework: 'Astro'
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Projects</h1>
          <p className="text-zinc-500">Manage and monitor your deployments</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-zinc-200 transition-colors">
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="glass-card p-6 group hover:border-white/20 transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                  {project.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-white transition-colors">{project.name}</h3>
                  <a href={`https://${project.url}`} className="text-xs text-zinc-500 flex items-center gap-1 hover:text-white transition-colors">
                    {project.url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className={project.status === 'Building' ? 'animate-pulse-slow' : ''}>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  project.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-400 mt-8">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                {project.branch}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {project.updatedAt}
              </div>
              <div className="ml-auto">
                <span className="bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-tighter">
                  {project.framework}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Placeholder for empty state / Add button */}
        <div className="border-2 border-dashed border-white/5 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-white/10 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-zinc-400" />
          </div>
          <span className="text-sm font-medium text-zinc-400">Add another project</span>
        </div>
      </div>

      <div className="mt-12 glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Recent Activity</h2>
          <button className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium text-white">ecommerce-frontend</span> was deployed successfully
                </p>
                <p className="text-xs text-zinc-500">2 minutes ago • production</p>
              </div>
              <button className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors">
                View Logs
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
