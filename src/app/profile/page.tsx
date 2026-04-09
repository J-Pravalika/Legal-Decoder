
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Header } from '@/components/header';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  User as UserIcon,
  Shield,
  BarChart2,
  KeyRound,
  Trash2,
  Edit,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Contract } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const PIE_CHART_COLORS = {
  High: 'hsl(var(--risk-high))',
  Medium: 'hsl(var(--risk-medium))',
  Low: 'hsl(var(--risk-low))',
  'N/A': 'hsl(var(--muted))',
};

function ProfilePageComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error('Error fetching user:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch user profile.' });
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: contractsData, error: contractsError } = await supabase
        .from('contract_analyses')
        .select('risk_level')
        .eq('user_id', user.id);

      if (contractsError) {
        console.error('Error fetching contracts:', contractsError);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch usage stats.' });
      } else {
        setContracts(contractsData.map((item: any) => ({
          id: item.id ?? '',
          name: item.file_name ?? '',
          status: item.status ?? 'Analyzed',
          riskLevel: item.risk_level,
          clauses: item.clauses_count ?? 0,
          analyzedAt: item.analyzed_at ?? new Date().toISOString(),
        })) as Contract[]);
      }

      setIsLoading(false);
    };
    fetchUserData();
  }, [router, toast]);
  
  const usageStats = {
    total: contracts.length,
    highRisk: contracts.filter(c => c.riskLevel === 'High').length,
    mediumRisk: contracts.filter(c => c.riskLevel === 'Medium').length,
    lowRisk: contracts.filter(c => c.riskLevel === 'Low').length,
  };

  const riskDistribution = [
      { name: 'High', value: usageStats.highRisk },
      { name: 'Medium', value: usageStats.mediumRisk },
      { name: 'Low', value: usageStats.lowRisk },
  ].filter(item => item.value > 0);


  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    } else {
      toast({ title: 'Success', description: 'Your password has been updated.' });
      setNewPassword('');
    }
    setIsUpdatingPassword(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    router.push('/');
  };
  
  const getInitials = (email: string | undefined) => {
      if (!email) return 'U';
      return email.charAt(0).toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-[#0B0C10] to-[#1A1A2E] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Profile...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-[#0B0C10] to-[#1A1A2E] text-white">
      <Header />
      <main className="flex-1 container mx-auto max-w-4xl py-12 px-4 sm:px-6 md:px-8 sm:py-16">
        <div className="space-y-4 mb-10 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Account Settings</h1>
            <p className="mt-3 text-lg text-muted-foreground">Manage your profile, security, and usage details.</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900/80 mb-8">
                <TabsTrigger value="profile"><UserIcon className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
                <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
                <TabsTrigger value="usage"><BarChart2 className="mr-2 h-4 w-4" /> Usage</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
                <Card className="glass-card">
                    <CardHeader className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                        <Avatar className="h-24 w-24">
                          <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-bold">{getInitials(user.email)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <CardTitle className="text-2xl font-heading">Your Profile</CardTitle>
                            <CardDescription>This is how your profile appears to us. You can edit your name.</CardDescription>
                             <Button variant="outline" size="sm" className="mt-4" disabled>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Name (Soon)
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex flex-col gap-2">
                           <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                           <p className="font-semibold text-foreground text-lg">{user.email}</p>
                        </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                           <p className="font-semibold text-foreground text-lg">{new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="security">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-2xl font-heading">Security</CardTitle>
                        <CardDescription>Manage your account's security settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                           <h4 className="font-semibold text-lg flex items-center gap-2"><KeyRound/> Change Password</h4>
                            <p className="text-muted-foreground text-sm">Set a new password for your account. Please choose a strong one.</p>
                             <div className="flex items-center gap-2 pt-2">
                                <Input 
                                    type="password"
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="max-w-xs"
                                    disabled={isUpdatingPassword}
                                />
                                <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !newPassword}>
                                    {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Update Password'}
                                </Button>
                            </div>
                        </div>

                         <div className="space-y-2 pt-4 border-t border-destructive/20">
                           <h4 className="font-semibold text-lg flex items-center gap-2 text-destructive"><Trash2/> Delete Account</h4>
                            <p className="text-muted-foreground text-sm">Permanently delete your account and all associated data. This action is irreversible.</p>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="mt-2">Delete My Account</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your account,
                                        all your analyzed contracts, and all other associated data.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/80">
                                        Yes, Delete My Account
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            
             <TabsContent value="usage">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-2xl font-heading">Usage Statistics</CardTitle>
                        <CardDescription>An overview of your activity on Legal Decoder.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="glass-card p-4 text-center">
                                <p className="text-4xl font-bold">{usageStats.total}</p>
                                <p className="text-sm text-muted-foreground">Total Contracts Analyzed</p>
                            </Card>
                             <Card className="glass-card p-4 text-center">
                                <p className="text-4xl font-bold text-red-500">{usageStats.highRisk}</p>
                                <p className="text-sm text-muted-foreground">High-Risk Contracts</p>
                            </Card>
                             <Card className="glass-card p-4 text-center">
                                <p className="text-4xl font-bold text-yellow-500">{usageStats.mediumRisk}</p>
                                <p className="text-sm text-muted-foreground">Medium-Risk Contracts</p>
                            </Card>
                             <Card className="glass-card p-4 text-center">
                                <p className="text-4xl font-bold text-green-500">{usageStats.lowRisk}</p>
                                <p className="text-sm text-muted-foreground">Low-Risk Contracts</p>
                            </Card>
                        </div>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip
                                        cursor={{ fill: 'hsla(var(--muted)/0.5)'}}
                                        contentStyle={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                    />
                                    <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                        {riskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[entry.name as keyof typeof PIE_CHART_COLORS]} />
                                        ))}
                                    </Pie>
                                    <Legend formatter={(value) => <span className="text-white/80">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageComponent />
    </AuthGuard>
  );
}

    