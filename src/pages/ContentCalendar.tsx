
import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Content, SocialPlatform } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ContentCard from "@/components/ui/ContentCard";
import { Link } from "react-router-dom";

const ContentCalendar: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"month" | "day">("month");
  const [platform, setPlatform] = useState<"all" | SocialPlatform>("all");

  // Sample data - in a real app this would come from an API
  const sampleContent: Content[] = [
    {
      id: "1",
      type: "image",
      intent: "promotional",
      platform: "instagram",
      content: "Our new summer collection has arrived! Check it out now. #fashion #summer #newcollection",
      mediaUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
      status: "scheduled",
      createdAt: new Date("2023-05-28"),
      scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 10, 0),
    },
    {
      id: "2",
      type: "text",
      intent: "news",
      platform: "twitter",
      content: "We're thrilled to announce our new partnership with @brandname! Stay tuned for exciting collaborations.",
      status: "scheduled",
      createdAt: new Date("2023-05-25"),
      scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 18, 14, 30),
    },
    {
      id: "3",
      type: "video",
      intent: "feature",
      platform: "instagram",
      content: "Check out the new features we just added to our app! Now you can organize your content even better.",
      mediaUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1674&q=80",
      status: "scheduled",
      createdAt: new Date("2023-05-20"),
      scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 22, 9, 0),
    },
    {
      id: "4",
      type: "image",
      intent: "poll",
      platform: "twitter",
      content: "Which new product would you like to see next? Let us know in the comments! #CustomerFeedback",
      mediaUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
      status: "scheduled",
      createdAt: new Date("2023-05-15"),
      scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 28, 16, 0),
    },
  ];

  // Filter content based on selected date and platform
  const filteredContent = sampleContent.filter((content) => {
    if (!content.scheduledFor) return false;
    
    const contentDate = new Date(content.scheduledFor);
    const selectedDate = new Date(date);
    
    const isSameDay = 
      contentDate.getDate() === selectedDate.getDate() &&
      contentDate.getMonth() === selectedDate.getMonth() &&
      contentDate.getFullYear() === selectedDate.getFullYear();
    
    if (view === "day" && !isSameDay) return false;
    if (platform !== "all" && content.platform !== platform) return false;
    
    return true;
  });

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDayDetails = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const prevMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() - 1);
    setDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    setDate(newDate);
  };

  const prevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };

  const today = () => {
    setDate(new Date());
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      setView("day");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <Button asChild>
          <Link to="/content-generation" className="flex items-center">
            <Plus size={16} className="mr-1" />
            <span>Create New</span>
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={view === "month" ? prevMonth : prevDay}>
                <ChevronLeft size={16} />
              </Button>
              <h2 className="text-lg font-medium">
                {view === "month" ? getMonthName(date) : getDayDetails(date)}
              </h2>
              <Button variant="ghost" size="sm" onClick={view === "month" ? nextMonth : nextDay}>
                <ChevronRight size={16} />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={today}>
                Today
              </Button>
              <Tabs value={view} onValueChange={(v) => setView(v as "month" | "day")}>
                <TabsList className="h-9">
                  <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                  <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={platform} onValueChange={(v) => setPlatform(v as "all" | SocialPlatform)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="instagram" className="text-xs">Instagram</TabsTrigger>
                  <TabsTrigger value="twitter" className="text-xs">Twitter</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "month" ? (
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-md border"
                modifiers={{
                  booked: sampleContent
                    .filter(content => content.scheduledFor && (platform === "all" || content.platform === platform))
                    .map(content => new Date(content.scheduledFor!)),
                }}
                modifiersStyles={{
                  booked: {
                    fontWeight: "bold",
                    backgroundColor: "hsl(var(--primary) / 0.1)",
                    borderRadius: "0",
                    color: "hsl(var(--primary))",
                  },
                }}
              />
            </div>
          ) : (
            <div>
              {filteredContent.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Content Scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    There's no content scheduled for this day.
                  </p>
                  <Button asChild>
                    <Link to="/content-generation">Schedule Content</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredContent
                    .sort((a, b) => (a.scheduledFor?.getTime() || 0) - (b.scheduledFor?.getTime() || 0))
                    .map((content) => (
                      <div key={content.id} className="flex">
                        <div className="w-24 flex-shrink-0 pr-4 pt-4">
                          <div className="text-sm font-medium">{formatTime(content.scheduledFor!)}</div>
                        </div>
                        <div className="flex-grow">
                          <ContentCard content={content} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sampleContent
                .filter(content => content.scheduledFor && content.scheduledFor > new Date())
                .sort((a, b) => (a.scheduledFor?.getTime() || 0) - (b.scheduledFor?.getTime() || 0))
                .slice(0, 3)
                .map((content) => (
                  <div key={content.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 mt-2 rounded-full ${content.platform === "instagram" ? "bg-pink-500" : "bg-blue-500"}`} />
                    <div>
                      <div className="text-sm font-medium">{content.content.substring(0, 60)}...</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {content.scheduledFor?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {formatTime(content.scheduledFor!)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Pick a date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    onSelect={(date) => {
                      if (date) {
                        toast({
                          title: "Date selected",
                          description: `You selected ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
                        });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  <span>9:00 AM</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>12:00 PM</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>3:00 PM</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>6:00 PM</span>
                </Button>
              </div>

              <div className="pt-4">
                <Button className="w-full">
                  Schedule Draft
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentCalendar;
