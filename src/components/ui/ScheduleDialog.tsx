
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (date: Date) => void;
  isScheduling?: boolean;
}

const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
  open,
  onOpenChange,
  onSchedule,
  isScheduling = false,
}) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState<string>("12");
  const [minute, setMinute] = useState<string>("00");
  const [period, setPeriod] = useState<string>("PM");

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, '0'));

  const handleSchedule = () => {
    if (!date) return;
    
    const scheduledDate = new Date(date);
    const hourValue = parseInt(hour);
    const minuteValue = parseInt(minute);
    
    // Convert 12-hour format to 24-hour format
    let hourIn24 = hourValue;
    if (period === 'PM' && hourValue !== 12) {
      hourIn24 = hourValue + 12;
    } else if (period === 'AM' && hourValue === 12) {
      hourIn24 = 0;
    }
    
    scheduledDate.setHours(hourIn24, minuteValue, 0, 0);
    onSchedule(scheduledDate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Content</DialogTitle>
          <DialogDescription>
            Select a date and time to schedule your content for publishing.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">Date</span>
            </div>
            <div className="rounded-md border">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </div>
          </div>
          <div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 opacity-70" />
              <span className="text-sm font-medium">Time</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger>
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger>
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="AM/PM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={!date || isScheduling}>
            {isScheduling ? "Scheduling..." : "Schedule Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDialog;
