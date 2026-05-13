'use client';

import { Rocket, Globe, Send, CheckCircle, AlertCircle, Clock, Activity, Loader2 } from 'lucide-react';
import { useDashboard } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  const stats = data?.stats || {
    totalProducts: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSubmissions: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    pendingManual: 0,
    socialPages: 0,
    accounts: 0,
  };

  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Rocket className="text-brand-600" size={32} />
          Launch Pilot
        </h1>
        <p className="text-gray-500 mt-1">Your marketing launch automation dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Campaigns"
          value={stats.activeCampaigns}
          subtitle={`${stats.totalCampaigns} total`}
          icon={<Activity className="text-brand-600" size={24} />}
          color="blue"
        />
        <StatCard
          title="Successful"
          value={stats.successfulSubmissions}
          subtitle={`of ${stats.totalSubmissions} submissions`}
          icon={<CheckCircle className="text-green-600" size={24} />}
          color="green"
        />
        <StatCard
          title="Needs Attention"
          value={stats.pendingManual}
          subtitle="manual action required"
          icon={<AlertCircle className="text-amber-600" size={24} />}
          color="amber"
        />
        <StatCard
          title="Social Pages"
          value={stats.socialPages}
          subtitle="created across platforms"
          icon={<Globe className="text-purple-600" size={24} />}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Rocket className="mx-auto mb-3 opacity-30" size={40} />
            <p>No activity yet. Create your first campaign to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentActivity.slice(0, 10).map((activity: any, i: number) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <StatusBadge status={activity.status} />
                  <div>
                    <p className="font-medium text-gray-900">{activity.platformName}</p>
                    <p className="text-sm text-gray-500">{activity.campaign?.product?.name}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-400">
                  {activity.updatedAt ? formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction title="New Campaign" description="Launch a new product across 25+ platforms" href="/campaigns/new" icon={<Rocket size={20} />} />
        <QuickAction title="Create Social Pages" description="Set up LinkedIn, Facebook, Instagram, Twitter" href="/social-pages" icon={<Globe size={20} />} />
        <QuickAction title="Quick Submit" description="Submit to all automated directories instantly" href="/quick-submit" icon={<Send size={20} />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string; value: number; subtitle: string; icon: React.ReactNode; color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    amber: 'bg-amber-50 border-amber-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color] || 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    success: { color: 'bg-green-100 text-green-800', label: 'Success' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
    manual_needed: { color: 'bg-amber-100 text-amber-800', label: 'Manual' },
    captcha_needed: { color: 'bg-orange-100 text-orange-800', label: 'CAPTCHA' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    queued: { color: 'bg-indigo-100 text-indigo-800', label: 'Queued' },
    pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending' },
  };
  const { color, label } = config[status] || config.pending;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}

function QuickAction({ title, description, href, icon }: {
  title: string; description: string; href: string; icon: React.ReactNode;
}) {
  return (
    <a href={href} className="block p-5 bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all group">
      <div className="flex items-center gap-2 text-brand-600 mb-2 group-hover:text-brand-700">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
