import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Video, Users, X, Heart, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";
import { LiveChatBox } from "./LiveChatBox";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  viewer_count: number;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

export const LiveStreamView: React.FC = () => {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<LiveStream | null>(null);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");

  useEffect(() => {
    fetchLiveStreams();
    
    const channel = supabase
      .channel('live_streams_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, fetchLiveStreams)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLiveStreams = async () => {
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .eq('is_live', true)
      .order('viewer_count', { ascending: false });

    if (!data) return;

    // Fetch profiles separately
    const streamsWithProfiles = await Promise.all(
      data.map(async (stream) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', stream.user_id)
          .single();

        return {
          ...stream,
          profiles: profile || undefined
        } as LiveStream;
      })
    );

    setLiveStreams(streamsWithProfiles);
  };

  const startStream = async () => {
    if (!user || !streamTitle.trim()) {
      toast.error("Enter a title to go live");
      return;
    }

    const { data, error } = await supabase
      .from('live_streams')
      .insert({
        user_id: user.id,
        title: streamTitle,
        is_live: true,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error) {
      await supabase.from('stream_credentials').insert({
        stream_id: data.id,
        stream_key: `${user.id}-${Date.now()}`,
        stream_url: `rtmp://stream.example.com/live`
      });

      setSelectedStream(data);
      setIsGoingLive(false);
      toast.success("🔴 You're live!");
    }
  };

  const endStream = async () => {
    if (!selectedStream) return;

    await supabase
      .from('live_streams')
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq('id', selectedStream.id);

    setSelectedStream(null);
    toast.success("Stream ended");
  };

  // Active Stream View
  if (selectedStream) {
    return (
      <div className="h-screen bg-black flex flex-col">
        {/* Video Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent z-10" />
          
          {/* Top Info */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 animate-fade-in">
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarImage src={selectedStream.profiles?.avatar_url} />
                <AvatarFallback>{selectedStream.profiles?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold">{selectedStream.profiles?.username}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                  <span className="text-white text-xs">{formatNumber(selectedStream.viewer_count)} watching</span>
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="text-white" onClick={() => setSelectedStream(null)}>
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Stream Title */}
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <p className="text-white text-lg font-semibold drop-shadow-lg">{selectedStream.title}</p>
          </div>

          {/* Actions */}
          <div className="absolute bottom-20 right-4 z-20 flex flex-col gap-4">
            <button className="flex flex-col items-center gap-1 animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Like</span>
            </button>
            <button className="flex flex-col items-center gap-1 animate-scale-in" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">Share</span>
            </button>
          </div>
        </div>

        {/* Live Chat */}
        <div className="h-80 bg-background border-t animate-slide-in-right">
          <LiveChatBox streamId={selectedStream.id} />
        </div>

        {/* End Stream (if owner) */}
        {user?.id === selectedStream.user_id && (
          <div className="p-4 bg-background border-t">
            <Button variant="destructive" className="w-full" onClick={endStream}>
              End Stream
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Go Live Dialog - TikTok Style
  if (isGoingLive) {
    return (
      <div className="h-screen bg-black flex flex-col">
        {/* Camera Preview Area */}
        <div className="flex-1 relative bg-gradient-to-br from-purple-900 to-pink-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center space-y-2">
              <Video className="w-16 h-16 mx-auto opacity-50" />
              <p className="text-sm opacity-75">Camera preview will appear here</p>
            </div>
          </div>
          
          {/* Close Button */}
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-4 left-4 text-white"
            onClick={() => setIsGoingLive(false)}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Controls */}
        <div className="bg-background p-4 space-y-4 rounded-t-3xl">
          <div className="space-y-2">
            <label className="text-sm font-medium">Stream Title</label>
            <Input
              placeholder="Tell viewers what you'll be doing..."
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              className="text-base h-12"
              maxLength={100}
            />
          </div>

          <Button 
            onClick={startStream} 
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600" 
            size="lg"
            disabled={!streamTitle.trim()}
          >
            <Video className="w-5 h-5 mr-2" />
            Go LIVE
          </Button>
        </div>
      </div>
    );
  }

  // Main View - TikTok Style
  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="p-4 space-y-4">
        {/* Header with prominent Go Live */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LIVE</h1>
            <p className="text-xs text-muted-foreground">Watch live streams now</p>
          </div>
          {user && (
            <Button 
              onClick={() => setIsGoingLive(true)} 
              className="h-12 px-6 animate-fade-in bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 font-semibold"
              size="lg"
            >
              <Video className="w-5 h-5 mr-2" />
              Go LIVE
            </Button>
          )}
        </div>

        {/* Live Streams Grid */}
        <div className="grid grid-cols-2 gap-3 pb-20">
          {liveStreams.map((stream, index) => (
            <Card
              key={stream.id}
              className="relative overflow-hidden cursor-pointer group animate-fade-in hover-scale"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedStream(stream)}
            >
              <div className="aspect-[9/16] bg-gradient-to-br from-purple-500 to-pink-500 relative">
                {/* Live Badge */}
                <Badge variant="destructive" className="absolute top-2 left-2 animate-pulse">
                  LIVE
                </Badge>

                {/* Viewer Count */}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">{formatNumber(stream.viewer_count)}</span>
                </div>

                {/* User Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-6 h-6 border border-white">
                      <AvatarImage src={stream.profiles?.avatar_url} />
                      <AvatarFallback>{stream.profiles?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white text-sm font-semibold">{stream.profiles?.username}</span>
                  </div>
                  <p className="text-white text-xs line-clamp-2">{stream.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {liveStreams.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-fade-in">
            <Video className="w-16 h-16 mb-4" />
            <p>No one is live right now</p>
            {user && <p className="text-sm mt-2">Be the first to go live!</p>}
          </div>
        )}
      </div>
    </div>
  );
};