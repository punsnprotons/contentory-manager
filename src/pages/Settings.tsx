import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Twitter } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InstagramConnectionStatus from '@/components/instagram/InstagramConnectionStatus';

const Settings = () => {
  const { toast } = useToast();

  const formSchema = z.object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Pedro Duarte",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      
      <div className="space-y-6">
        {/* Twitter Connection */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Twitter Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Twitter account to publish content and view analytics.
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Twitter Account</CardTitle>
              <CardDescription>
                Connect your Twitter account to enable posting and analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                <Twitter className="w-4 h-4 mr-2" />
                Connect Twitter (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Instagram Connection */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Instagram Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Instagram business account to publish content and view analytics.
          </p>
          <InstagramConnectionStatus />
        </div>
        
        {/* Profile */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Profile</h2>
          <Card>
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
              <CardDescription>
                Make changes to your profile here. Click save when you're done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Pedro Duarte" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Submit</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Appearance */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Appearance</h2>
          <Card>
            <CardHeader>
              <CardTitle>Customize appearance</CardTitle>
              <CardDescription>
                Customize how the application looks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="col-span-1">
                  <Label htmlFor="theme">Theme</Label>
                  <Select>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when you receive email notifications below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      Push Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send push notifications to your device.
                    </p>
                  </div>
                  <Switch id="push" />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      Email Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications to your inbox.
                    </p>
                  </div>
                  <Switch id="email" defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      SMS Notifications
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Send SMS notifications to your phone.
                    </p>
                  </div>
                  <Switch id="sms" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
