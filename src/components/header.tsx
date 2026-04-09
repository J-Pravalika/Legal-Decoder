
'use client';
import { Menu, Scale, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { LogoutButton } from './LogoutButton';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useRouter } from 'next/navigation';


const loggedOutLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
];

const loggedInLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analyze", label: "Analyze Contract" },
  { href: "/compare", label: "Compare" },
  { href: "/clause-explorer", label: "Clause Explorer" },
  { href: "/chat", label: "AI Chat" },
];

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();


  useEffect(() => {
    const fetchSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setIsLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };
  }, []);

  const getInitials = (email: string | undefined) => {
      if (!email) return 'U';
      return email.charAt(0).toUpperCase();
  }
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navLinks = user ? loggedInLinks : loggedOutLinks;

  return (
    <header className={cn(
        "sticky top-0 z-50 w-full border-b",
        "border-white/10 bg-background/80",
        "backdrop-blur-lg"
    )}>
      <div className="container flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8 md:px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                "bg-white/10"
            )}>
              <Scale className="h-5 w-5 text-white" />
            </div>
            <h1 className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight font-heading",
                "text-white"
            )}>
              Legal Decoder
            </h1>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
             <Link 
                key={link.href + link.label} 
                href={link.href} 
                className={cn(
                    "text-gray-300 hover:text-white",
                    "transition-colors",
                    { "text-primary font-semibold": pathname === link.href }
                )}
             >
               {link.label}
             </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
            {!isLoading && (
              user ? (
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                       <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold">{getInitials(user.email)}</AvatarFallback>
                       </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">My Account</p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                       <Link href="/profile"><DropdownMenuItem className="cursor-pointer"><UserIcon className="mr-2"/>Profile</DropdownMenuItem></Link>
                       <Link href="/dashboard"><DropdownMenuItem className="cursor-pointer"><Scale className="mr-2"/>Dashboard</DropdownMenuItem></Link>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <LogoutButton />
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild size="sm" className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/login">Get Started</Link>
                </Button>
              )
            )}

            {/* Mobile Navigation */}
             <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className={cn("h-6 w-6", "text-white")} />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px] bg-background border-white/20">
                  {navLinks.map((link) => (
                    <Link key={link.href + link.label} href={link.href}>
                      <DropdownMenuItem className="cursor-pointer text-base">
                        {link.label}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  <DropdownMenuSeparator />
                   {!isLoading && (user ? (
                      <LogoutButton />
                    ) : (
                      <Link href="/login">
                        <DropdownMenuItem className="cursor-pointer text-base">
                          Login
                        </DropdownMenuItem>
                      </Link>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
      </div>
    </header>
  );
}
