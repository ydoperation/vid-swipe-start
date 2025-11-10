import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, Heart, Share2, Users, TrendingUp, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatNumber } from "@/lib/utils";

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalFollowers: number;
  totalVideos: number;
  avgViews: number;
  topVideo: {
    id: string;
    caption: string;
    views: number;
  } | null;
}

interface UserAnalyticsViewProps {
  onBack: () => void;
}

export const UserAnalyticsView: React.FC<UserAnalyticsViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    totalFollowers: 0,
    totalVideos: 0,
    avgViews: 0,
    topVideo: null,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Calculate date filter
    let dateFilter = new Date();
    if (timeRange === '7d') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (timeRange === '30d') {
      dateFilter.setDate(dateFilter.getDate() - 30);
    }
    
    const dateFilterStr = timeRange === 'all' ? null : dateFilter.toISOString();
    
    // Get video stats
    let videoQuery = supabase
      .from('videos')
      .select('id, caption, views')
      .eq('user_id', user.id);
    
    if (dateFilterStr) {
      videoQuery = videoQuery.gte('created_at', dateFilterStr);
    }
    
    const { data: videos } = await videoQuery;
    
    const totalViews = videos?.reduce((sum: number, v: any) => sum + (v.views || 0), 0) || 0;
    const totalVideos = videos?.length || 0;
    
    // Get top video
    const topVideo = videos?.length 
      ? videos.reduce((max, v) => (v.views || 0) > (max.views || 0) ? v : max)
      : null;
    
    // Get followers
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);
    
    setAnalytics({
      totalViews,
      totalLikes: 0,
      totalShares: 0,
      totalFollowers: followersCount || 0,
      totalVideos,
      avgViews: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
      topVideo: topVideo ? {
        id: topVideo.id,
        caption: topVideo.caption,
        views: topVideo.views || 0,
      } : null,
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs text-muted-foreground">Track your performance</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Views</p>
                <p className="text-xl font-bold">{formatNumber(analytics.totalViews)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Likes</p>
                <p className="text-xl font-bold">{formatNumber(analytics.totalLikes)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Followers</p>
                <p className="text-xl font-bold">{formatNumber(analytics.totalFollowers)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shares</p>
                <p className="text-xl font-bold">{formatNumber(analytics.totalShares)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Content Performance */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Video className="w-5 h-5" />
            Content Performance
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Videos</span>
              <span className="text-lg font-bold">{analytics.totalVideos}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg. Views per Video</span>
              <span className="text-lg font-bold">{formatNumber(analytics.avgViews)}</span>
            </div>

            {analytics.topVideo && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Top Performing Video</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium line-clamp-2 mb-2">{analytics.topVideo.caption}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      <span>{formatNumber(analytics.topVideo.views)} views</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Engagement Rate */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Engagement
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Likes per View</span>
                <span className="text-sm font-bold">
                  {analytics.totalViews > 0 
                    ? ((analytics.totalLikes / analytics.totalViews) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-500"
                  style={{ 
                    width: `${analytics.totalViews > 0 
                      ? Math.min((analytics.totalLikes / analytics.totalViews) * 100, 100)
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Shares per View</span>
                <span className="text-sm font-bold">
                  {analytics.totalViews > 0 
                    ? ((analytics.totalShares / analytics.totalViews) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ 
                    width: `${analytics.totalViews > 0 
                      ? Math.min((analytics.totalShares / analytics.totalViews) * 100, 100)
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2">💡 Tips to Grow</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Post consistently at peak hours</li>
            <li>• Use trending sounds and hashtags</li>
            <li>• Engage with your audience in comments</li>
            <li>• Go live to connect with followers</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
