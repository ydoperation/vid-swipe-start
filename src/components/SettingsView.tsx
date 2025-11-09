import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, User, Lock, Bell, Video, Shield, 
  Moon, Sun, Monitor, LogOut, ChevronRight,
  Users, Gift, Ban, Edit, Mail, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/utils";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  autoplay_videos: boolean;
  notification_videos: boolean;
  notification_live: boolean;
  notification_gifts: boolean;
  privacy_profile: 'public' | 'friends' | 'private';
  two_factor_enabled: boolean;
}

export const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    autoplay_videos: true,
    notification_videos: true,
    notification_live: true,
    notification_gifts: true,
    privacy_profile: 'public',
    two_factor_enabled: false
  });
  
  // Edit account state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [profile, setProfile] = useState({
    username: "",
    display_name: "",
    bio: "",
    website_url: "",
    instagram_url: "",
    twitter_url: "",
    youtube_url: ""
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      loadSettings();
      loadProfile();
      setNewEmail(user.email || "");
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setSettings({
        theme: data.theme as any,
        autoplay_videos: data.autoplay_videos,
        notification_videos: data.notification_videos,
        notification_live: data.notification_live,
        notification_gifts: data.notification_gifts,
        privacy_profile: data.privacy_profile as any,
        two_factor_enabled: data.two_factor_enabled
      });
      applyTheme(data.theme);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user) return;
    
    setSettings(prev => ({ ...prev, [key]: value }));
    
    if (key === 'theme') applyTheme(value);
    
    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, [key]: value });
    
    toast.success("Settings updated");
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile({
        username: data.username || "",
        display_name: data.display_name || "",
        bio: data.bio || "",
        website_url: data.website_url || "",
        instagram_url: data.instagram_url || "",
        twitter_url: data.twitter_url || "",
        youtube_url: data.youtube_url || ""
      });
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail) return;
    
    const emailSchema = z.string().email("Invalid email address");
    const validation = emailSchema.safeParse(newEmail);
    
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }
    
    if (newEmail === user.email) {
      toast.error("New email is the same as current email");
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;
      
      toast.success("Email update initiated! Please check your new email to confirm the change.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    // Validate with zod
    const validation = profileSchema.safeParse(profile);
    
    if (!validation.success) {
      const errors = validation.error.issues.map(i => i.message).join(', ');
      toast.error(errors);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          display_name: profile.display_name || profile.username,
          bio: profile.bio || null,
          website_url: profile.website_url || null,
          instagram_url: profile.instagram_url || null,
          twitter_url: profile.twitter_url || null,
          youtube_url: profile.youtube_url || null
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success("Profile updated successfully!");
      setShowEditDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="w-9" />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="max-w-2xl mx-auto p-4 space-y-2 pb-24">
          
          {/* Account */}
          <Card className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Account</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Theme */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <p className="font-semibold">Theme</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                onClick={() => updateSetting('theme', 'light')}
                size="sm"
                className="w-full"
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => updateSetting('theme', 'dark')}
                size="sm"
                className="w-full"
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
              <Button
                variant={settings.theme === 'system' ? 'default' : 'outline'}
                onClick={() => updateSetting('theme', 'system')}
                size="sm"
                className="w-full"
              >
                <Monitor className="w-4 h-4 mr-1" />
                Auto
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium">New Videos</p>
              </div>
              <Switch
                checked={settings.notification_videos}
                onCheckedChange={(checked) => updateSetting('notification_videos', checked)}
              />
            </div>
            <Separator />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Video className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium">Live Streams</p>
              </div>
              <Switch
                checked={settings.notification_live}
                onCheckedChange={(checked) => updateSetting('notification_live', checked)}
              />
            </div>
            <Separator />
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium">Gifts</p>
              </div>
              <Switch
                checked={settings.notification_gifts}
                onCheckedChange={(checked) => updateSetting('notification_gifts', checked)}
              />
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="font-semibold">Privacy</p>
            </div>
            <Select 
              value={settings.privacy_profile}
              onValueChange={(value: any) => updateSetting('privacy_profile', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Profile visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          {/* Security */}
          <Card className="overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Two-Factor Auth</p>
                  <p className="text-xs text-muted-foreground">Extra security</p>
                </div>
              </div>
              <Switch
                checked={settings.two_factor_enabled}
                onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
              />
            </div>
          </Card>

          {/* Playback */}
          <Card className="overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Video className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium">Autoplay Videos</p>
              </div>
              <Switch
                checked={settings.autoplay_videos}
                onCheckedChange={(checked) => updateSetting('autoplay_videos', checked)}
              />
            </div>
          </Card>

          {/* Admin Badge */}
          {isAdmin && (
            <Card className="p-4 bg-destructive/5 border-destructive/20">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Admin Access Enabled</p>
              </div>
            </Card>
          )}

          {/* Sign Out */}
          <div className="pt-4">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Account & Profile</DialogTitle>
            <DialogDescription>
              Update your email address and profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Email Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Email Address</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={isUpdating}
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive a confirmation email to verify the change
                </p>
              </div>
              <Button
                onClick={handleUpdateEmail}
                disabled={isUpdating || newEmail === user?.email}
                size="sm"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Email"
                )}
              </Button>
            </div>

            <Separator />

            {/* Profile Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Profile Information</h3>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="username"
                    disabled={isUpdating}
                  />
                  <p className="text-xs text-muted-foreground">
                    3-30 characters, letters, numbers, and underscores only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    placeholder="Your Name"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                    disabled={isUpdating}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {profile.bio.length}/500 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    type="url"
                    value={profile.website_url}
                    onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    type="url"
                    value={profile.instagram_url}
                    onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/username"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter/X URL</Label>
                  <Input
                    id="twitter"
                    type="url"
                    value={profile.twitter_url}
                    onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/username or https://x.com/username"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube URL</Label>
                  <Input
                    id="youtube"
                    type="url"
                    value={profile.youtube_url}
                    onChange={(e) => setProfile({ ...profile, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/channel/..."
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};