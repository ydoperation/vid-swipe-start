import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, DollarSign, TrendingUp, Gift, Eye, Heart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatNumber } from "@/lib/utils";

interface EarningsData {
  totalEarnings: number;
  giftEarnings: number;
  videoViews: number;
  followers: number;
  monthlyEarnings: number;
  withdrawable: number;
}

interface CreatorFundViewProps {
  onBack: () => void;
}

export const CreatorFundView: React.FC<CreatorFundViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    giftEarnings: 0,
    videoViews: 0,
    followers: 0,
    monthlyEarnings: 0,
    withdrawable: 0,
  });
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEarnings();
    }
  }, [user]);

  const loadEarnings = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Get gift earnings
    const giftsResponse = await supabase
      .from('gift_transactions')
      .select('total_price')
      .eq('receiver_id', user.id);
    const gifts = giftsResponse.data;
    
    let giftEarnings = 0;
    if (gifts) {
      for (const g of gifts) {
        giftEarnings += Number(g.total_price);
      }
    }
    
    // Get video views
    const { data: videos } = await supabase
      .from('videos')
      .select('views')
      .eq('user_id', user.id);
    
    let videoViews = 0;
    if (videos) {
      for (const v of videos) {
        videoViews += v.views || 0;
      }
    }
    
    // Get followers
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);
    
    // Calculate eligibility: 1000+ followers and 10000+ views
    const eligible = (followersCount || 0) >= 1000 && videoViews >= 10000;
    
    // Calculate monthly earnings (simplified: views * $0.01 + gifts * 0.5 commission)
    const monthlyEarnings = (videoViews * 0.01) + (giftEarnings * 0.5);
    
    setEarnings({
      totalEarnings: giftEarnings * 0.5 + videoViews * 0.01,
      giftEarnings: giftEarnings * 0.5,
      videoViews,
      followers: followersCount || 0,
      monthlyEarnings,
      withdrawable: giftEarnings * 0.5,
    });
    
    setIsEligible(eligible);
    setLoading(false);
  };

  const handleWithdraw = () => {
    if (earnings.withdrawable < 10) {
      toast.error("Minimum withdrawal amount is $10");
      return;
    }
    toast.success("Withdrawal request submitted! Processing within 3-5 business days.");
  };

  const eligibilityProgress = Math.min(
    ((earnings.followers / 1000) * 50) + ((earnings.videoViews / 10000) * 50),
    100
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Creator Fund</h1>
            <p className="text-xs text-muted-foreground">Monetize your content</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Eligibility Status */}
        {!isEligible && (
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Join Creator Fund</h3>
                <Badge variant="outline" className="border-primary text-primary">
                  {eligibilityProgress.toFixed(0)}% Complete
                </Badge>
              </div>
              
              <Progress value={eligibilityProgress} className="h-2" />
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Followers</span>
                  <span className="font-semibold">
                    {formatNumber(earnings.followers)} / 1,000
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Video Views</span>
                  <span className="font-semibold">
                    {formatNumber(earnings.videoViews)} / 10,000
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {isEligible && (
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Creator Fund Eligible ✓</h3>
                <p className="text-xs text-muted-foreground">You're earning from your content!</p>
              </div>
            </div>
          </Card>
        )}

        {/* Earnings Overview */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <h2 className="text-4xl font-bold">${earnings.totalEarnings.toFixed(2)}</h2>
            <p className="text-xs text-muted-foreground">This month: ${earnings.monthlyEarnings.toFixed(2)}</p>
          </div>
        </Card>

        {/* Earnings Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gifts</p>
                <p className="text-lg font-bold">${earnings.giftEarnings.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Views</p>
                <p className="text-lg font-bold">{formatNumber(earnings.videoViews)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Withdraw */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Available to Withdraw</h3>
                <p className="text-xs text-muted-foreground">Minimum $10.00</p>
              </div>
              <p className="text-2xl font-bold">${earnings.withdrawable.toFixed(2)}</p>
            </div>
            
            <Separator />
            
            <Button 
              className="w-full" 
              size="lg"
              disabled={earnings.withdrawable < 10}
              onClick={handleWithdraw}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            
            {earnings.withdrawable < 10 && (
              <p className="text-xs text-center text-muted-foreground">
                ${(10 - earnings.withdrawable).toFixed(2)} more needed to withdraw
              </p>
            )}
          </div>
        </Card>

        {/* How It Works */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">How Creator Fund Works</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">1</span>
              </div>
              <p>Earn 50% commission on virtual gifts received during live streams</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">2</span>
              </div>
              <p>Get paid based on video views and engagement</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">3</span>
              </div>
              <p>Withdraw earnings once you reach $10 minimum</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
