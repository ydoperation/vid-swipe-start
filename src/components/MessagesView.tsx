import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Search, Phone, Video } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const MessagesView: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        loadConversations(user.id);
      }
    });

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (currentUserId) loadConversations(currentUserId);
        if (selectedUser) loadMessages(selectedUser.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, selectedUser]);

  const loadConversations = async (userId: string) => {
    const { data } = await supabase.rpc('get_user_conversations');
    
    if (data) {
      const withProfiles = await Promise.all(
        data.map(async (conv: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', conv.other_user_id)
            .single();
          return { ...conv, profile };
        })
      );
      setConversations(withProfiles);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    await supabase.from('messages').insert({
      sender_id: currentUserId,
      recipient_id: selectedUser.id,
      content: newMessage.trim()
    });

    setNewMessage("");
  };

  // Chat View
  if (selectedUser) {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center gap-3 p-4">
            <Button size="icon" variant="ghost" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedUser.avatar_url || undefined} />
              <AvatarFallback>{selectedUser.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{selectedUser.display_name || selectedUser.username}</p>
              <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
            </div>
            <Button size="icon" variant="ghost">
              <Phone className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost">
              <Video className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 animate-fade-in ${isMe ? 'flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {!isMe && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback>{selectedUser.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground px-2">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations List
  const filteredConversations = conversations.filter(c =>
    c.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="p-4 space-y-3">
          <h1 className="text-2xl font-bold">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredConversations.map((conv, idx) => (
            <button
              key={conv.conversation_id}
              onClick={() => {
                setSelectedUser(conv.profile);
                loadMessages(conv.other_user_id);
              }}
              className="w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={conv.profile?.avatar_url} />
                <AvatarFallback>{conv.profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold truncate">{conv.profile?.display_name || conv.profile?.username}</p>
                  <span className="text-xs text-muted-foreground">
                    {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conv.last_message}</p>
              </div>
              {!conv.read_at && <div className="w-2 h-2 rounded-full bg-primary" />}
            </button>
          ))}
        </div>

        {filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-fade-in">
            <p>No messages yet</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MessagesView;