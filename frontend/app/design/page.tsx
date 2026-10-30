"use client";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../../components/ui/tooltip";
import { Skeleton } from "../../components/ui/skeleton";
export default function DesignPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-4 sm:p-8">
      <header className="space-y-3">
        <Badge variant="outline">RELAYMARK / DESIGN 01</Badge>
        <h1 className="text-4xl font-semibold">Clarity, by design.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          One visual language for links, signals, and decisions. Explore the
          components in either theme using the top-bar toggle.
        </p>
      </header>
      <Tabs defaultValue="components">
        <TabsList aria-label="Design sections">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="foundations">Foundations</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Actions & inputs
              </CardTitle>
              <CardDescription>
                Clear hierarchy, visible focus, explicit labels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => toast.success("Sample link created")}>
                  Primary action
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="space-y-2">
                <label htmlFor="design-url" className="text-sm font-medium">
                  Destination URL
                </label>
                <Input id="design-url" placeholder="https://example.com" />
                <p className="text-xs text-muted-foreground">
                  Use an HTTPS address.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Active</Badge>
                <Badge variant="secondary">Pending</Badge>
                <Badge variant="outline">Sample</Badge>
                <Badge variant="destructive">Blocked</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Overlays & feedback
              </CardTitle>
              <CardDescription>
                Keyboard-friendly primitives, built on Radix.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open example dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Review a sample link</DialogTitle>
                  <DialogDescription>
                    This preview does not change data. Escape closes the dialog
                    and restores focus.
                  </DialogDescription>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Example menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onSelect={() => toast("Sample action selected")}
                  >
                    View sample details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => toast.success("Sample copied")}
                  >
                    Copy sample code
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline">Focus for a tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>
                  Helpful context, available by keyboard.
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => toast.success("Everything is up to date")}>
                Show toast
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Table
              </CardTitle>
              <CardDescription>
                Compact data with readable headers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Code</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["welcome", "guide", "launch"].map((code, index) => (
                    <TableRow key={code}>
                      <TableCell className="font-medium">{code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                      <TableCell>{12 + index * 8}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Loading state
              </CardTitle>
              <CardDescription>
                Static preview; respects reduced motion.
              </CardDescription>
            </CardHeader>
            <CardContent aria-label="Loading preview" className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <p className="text-xs text-muted-foreground">
                Skeleton shapes are hidden from assistive technology.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="foundations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Semantic color
              </CardTitle>
              <CardDescription>
                One teal accent; colors adapt together.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["background", "primary", "accent", "muted"].map((color) => (
                <div key={color} className="rounded-lg border p-3">
                  <div
                    className="mb-3 h-16 rounded-md border"
                    style={{ backgroundColor: `var(--${color})` }}
                  />
                  <span className="text-sm">{color}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                Inter / a measured rhythm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">
                Small links. Clear signals.
              </p>
              <p className="text-base">
                Body / 16px • supporting / 14px • labels / 12px
              </p>
              <p className="text-sm text-muted-foreground">
                Spacing: 4, 8, 12, 16, 24, 32, 48px. Base radius: 12px.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
