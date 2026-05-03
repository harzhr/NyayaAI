import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, MessagesSquare, LayoutDashboard, Scale, LogIn, LogOut, UserPlus, Gavel, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const homeItem = { title: "Home", url: "/", icon: Home };
const findLawyerItem = { title: "Find a lawyer", url: "/find-lawyer", icon: Users };

const endUserNavItems = [
  { title: "AI Chat", url: "/chat", icon: MessagesSquare },
  { title: "Lawyer chat", url: "/lawyer-chat", icon: Gavel },
];

const userAccountItem = { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard };

const lawyerNavItems = [{ title: "Lawyer dashboard", url: "/lawyer-dashboard", icon: Scale }];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isActive = (path: string) => pathname === path;

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    }`;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-hero text-primary-foreground shadow-soft">
            <Scale className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-bold text-sidebar-foreground">NyayaAI</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Legal Advisor</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(homeItem.url)}>
                  <NavLink to={homeItem.url} className={linkCls(isActive(homeItem.url))}>
                    <homeItem.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{homeItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {(!user || user.role === "user") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(findLawyerItem.url)}>
                    <NavLink to={findLawyerItem.url} className={linkCls(isActive(findLawyerItem.url))}>
                      <findLawyerItem.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{findLawyerItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {!user &&
                endUserNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

              {user && user.role === "lawyer" &&
                lawyerNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

              {user && user.role === "user" && (
                <>
                  {endUserNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} className={linkCls(isActive(item.url))}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive(userAccountItem.url)}>
                      <NavLink to={userAccountItem.url} className={linkCls(isActive(userAccountItem.url))}>
                        <userAccountItem.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{userAccountItem.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!user ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/login")}>
                      <NavLink to="/login" className={linkCls(isActive("/login"))}>
                        <LogIn className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Login</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/signup")}>
                      <NavLink to="/signup" className={linkCls(isActive("/signup"))}>
                        <UserPlus className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Sign up</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/lawyer-signup")}>
                      <NavLink to="/lawyer-signup" className={linkCls(isActive("/lawyer-signup"))}>
                        <Scale className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Lawyer sign up</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <div className="px-2 py-2">
                    {!collapsed && (
                      <div className="mb-2 truncate text-xs text-muted-foreground">
                        Signed in as <span className="font-medium text-sidebar-foreground">{user.name}</span>
                        {user.role === "lawyer" && (
                          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Lawyer</span>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {!collapsed && "Logout"}
                    </Button>
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
