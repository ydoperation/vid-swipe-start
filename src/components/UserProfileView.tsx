import React, { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Share2, Flag, MoreVertical } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReportModal } from "@/components/ReportModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
  onMessage: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadVideos();
    loadFollowStats();
    checkFollowing();
  }, [userId]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", userId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (data) setVideos(data);
  };

  const loadFollowStats = async () => {
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: 'exact', head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: 'exact', head: true })
      .eq("follower_id", userId);

    setFollowers(followersCount || 0);
    setFollowing(followingCount || 0);
  };

  const checkFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .single();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user) {
      toast.error("Please login to follow");
      return;
    }

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      
      toast.success("Unfollowed");
      setIsFollowing(false);
      setFollowers(prev => prev - 1);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      toast.success("Following");
      setIsFollowing(true);
      setFollowers(prev => prev + 1);
    }
  };

  if (loading || !profile) {
    return <div className="h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen bg-background overflow-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold">@{profile.username}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowReportModal(true)}>
                <Flag className="w-4 h-4 mr-2" />
                Report User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <Avatar className="w-24 h-24 border-2 border-primary">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-3xl">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex gap-2">
            <Button
              onClick={toggleFollow}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="min-w-[100px] animate-scale-in"
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
            <Button onClick={onMessage} variant="outline" size="sm" className="animate-scale-in" style={{ animationDelay: '50ms' }}>
              <MessageCircle className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="animate-scale-in" style={{ animationDelay: '100ms' }}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
          {profile.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          <button className="flex flex-col items-center hover-scale">
            <span className="font-bold text-lg">{formatNumber(following)}</span>
            <span className="text-sm text-muted-foreground">Following</span>
          </button>
          <button className="flex flex-col items-center hover-scale">
            <span className="font-bold text-lg">{formatNumber(followers)}</span>
            <span className="text-sm text-muted-foreground">Followers</span>
          </button>
          <button className="flex flex-col items-center hover-scale">
            <span className="font-bold text-lg">{formatNumber(videos.length)}</span>
            <span className="text-sm text-muted-foreground">Videos</span>
          </button>
        </div>

        {/* Social Links */}
        {(profile.instagram_url || profile.youtube_url || profile.twitter_url || profile.website_url) && (
          <div className="flex gap-2">
            {profile.instagram_url && (
              <Badge variant="secondary" className="hover-scale">Instagram</Badge>
            )}
            {profile.youtube_url && (
              <Badge variant="secondary" className="hover-scale">YouTube</Badge>
            )}
            {profile.twitter_url && (
              <Badge variant="secondary" className="hover-scale">Twitter</Badge>
            )}
            {profile.website_url && (
              <Badge variant="secondary" className="hover-scale">Website</Badge>
            )}
          </div>
        )}
      </div>

      {/* Videos Grid */}
      <div className="p-4">
        <h3 className="font-semibold mb-3">Videos</h3>
        <div className="grid grid-cols-3 gap-1">
          {videos.map((video, idx) => (
            <div
              key={video.id}
              className="aspect-[9/16] bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg overflow-hidden cursor-pointer hover-scale animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {video.thumbnail && (
                <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground animate-fade-in">
            No videos yet
          </div>
        )}
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        itemType="profile"
        itemId={userId}
        itemTitle={`@${profile.username}`}
      />
    </div>
  );
};